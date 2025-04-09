import express from 'express';
import joi from 'joi';
import mongoose from 'mongoose';
import Project from '../models/index.js'

const api = express.Router()

api.get('/projects', async (req, res) => {
    try {
        const data = await Project.find({}, { task: 0, __v: 0, updatedAt: 0 })
        return res.send(data)
    } catch (error) {
        return res.send(error)
    }
})

api.get('/project/:id', async (req, res) => {
    if (!req.params.id) return res.status(422).send({ data: { error: true, message: 'Id is required' } })
    try {
        // Convert string ID to ObjectId safely with better error handling
        let objectId;
        try {
            objectId = new mongoose.Types.ObjectId(req.params.id);
        } catch (idError) {
            return res.status(400).send({ data: { error: true, message: 'Invalid project ID format' } });
        }
        
        const data = await Project.find({ _id: objectId }).sort({ order: 1 })
        
        if (!data || data.length === 0) {
            return res.status(404).send({ data: { error: true, message: 'Project not found' } })
        }
        
        return res.send(data)
    } catch (error) {
        console.error('Project fetch error:', error);
        return res.status(500).send({ data: { error: true, message: 'Server error fetching project' } })
    }
})

api.post('/project', async (req, res) => {

    // validate type 
    const project = joi.object({
        title: joi.string().min(3).max(30).required(),
        description: joi.string().required(),
    })

    // validation
    const { error, value } = project.validate({ title: req.body.title, description: req.body.description });
    if (error) return res.status(422).send(error)


    // insert data 
    try {
        const data = await new Project(value).save()
        res.send({ data: { title: data.title, description: data.description, updatedAt: data.updatedAt, _id: data._id } })

    } catch (e) {
        if (e.code === 11000) {
            return res.status(422).send({ data: { error: true, message: 'title must be unique' } })
        } else {
            return res.status(500).send({ data: { error: true, message: 'server error' } })
        }
    }


})

api.put('/project/:id', async (req, res) => {
    // validate type 
    const project = joi.object({
        title: joi.string().min(3).max(30).required(),
        description: joi.string().required(),
    })

    // // validation
    const { error, value } = project.validate({ title: req.body.title, description: req.body.description });
    if (error) return res.status(422).send(error)

    Project.updateOne({ _id: mongoose.Types.ObjectId(req.params.id) }, { ...value }, { upsert: true }, (error, data) => {
        if (error) {
            res.send(error)
        } else {
            res.send(data)
        }
    })


})

api.delete('/project/:id', async (req, res) => {
    try {
        const data = await Project.deleteOne({ _id: mongoose.Types.ObjectId(req.params.id) })
        res.send(data)
    } catch (error) {
        res.send(error)
    }

})


//  task api   

api.post('/project/:id/task', async (req, res) => {
    if (!req.params.id) return res.status(400).send({ error: true, message: 'Project ID is required' });

    // validate type 
    const task = joi.object({
        title: joi.string().min(3).max(30).required(),
        description: joi.string().required(),
    })

    const { error, value } = task.validate({ title: req.body.title, description: req.body.description });
    if (error) return res.status(422).send(error)

    try {
        // Convert string ID to ObjectId safely
        let objectId;
        try {
            objectId = new mongoose.Types.ObjectId(req.params.id);
        } catch (idError) {
            return res.status(400).send({ error: true, message: 'Invalid project ID format' });
        }

        // Check if project exists
        const project = await Project.findById(objectId);
        if (!project) {
            return res.status(404).send({ error: true, message: 'Project not found' });
        }
        
        // Get tasks with index
        const tasks = project.task || [];
        
        // Calculate new task index and order
        const taskLength = tasks.length;
        const maxIndex = taskLength > 0 ? Math.max(...tasks.map(t => t.index || 0)) : 0;
        
        // Create new task with better data structure
        const newTask = { 
            ...value, 
            stage: "Requested", 
            order: taskLength, 
            index: maxIndex + 1,
            created_at: new Date(),
            updated_at: new Date()
        };
        
        // Update the project with the new task
        const data = await Project.updateOne(
            { _id: objectId }, 
            { $push: { task: newTask } }
        );
        
        if (data.modifiedCount === 0) {
            return res.status(400).send({ error: true, message: 'Failed to add task' });
        }
        
        // Return the complete data including the new task for frontend update
        return res.status(201).send({
            success: true,
            message: 'Task created successfully',
            data: data,
            task: newTask
        });
    } catch (error) {
        console.error('Task creation error:', error);
        return res.status(500).send({ error: true, message: 'Server error creating task' })
    }
})

api.get('/project/:id/task/:taskId', async (req, res) => {
    if (!req.params.id || !req.params.taskId) {
        return res.status(400).send({ error: true, message: 'Project ID and Task ID are required' });
    }

    try {
        // Convert string IDs to ObjectId safely
        let projectId, taskId;
        try {
            projectId = new mongoose.Types.ObjectId(req.params.id);
            taskId = new mongoose.Types.ObjectId(req.params.taskId);
        } catch (idError) {
            return res.status(400).send({ error: true, message: 'Invalid ID format' });
        }

        let data = await Project.find(
            { _id: projectId },
            {
                task: {
                    $filter: {
                        input: "$task",
                        as: "task",
                        cond: {
                            $in: [
                                "$$task._id",
                                [taskId]
                            ]
                        }
                    }
                }
            })
            
        if (!data || data.length === 0 || !data[0].task || data[0].task.length < 1) {
            return res.status(404).send({ error: true, message: 'Task not found' })
        }
        
        return res.send(data)
    } catch (error) {
        console.error('Error fetching task:', error);
        return res.status(500).send({ error: true, message: 'Server error fetching task' })
    }
})


api.put('/project/:id/task/:taskId', async (req, res) => {

    if (!req.params.id || !req.params.taskId) return res.status(500).send(`server error`);

    const task = joi.object({
        title: joi.string().min(3).max(30).required(),
        description: joi.string().required(),
    })

    const { error, value } = task.validate({ title: req.body.title, description: req.body.description });
    if (error) return res.status(422).send(error)

    try {
        // const data = await Project.find({ $and: [{ _id: mongoose.Types.ObjectId(req.params.id) }, { "task._id": mongoose.Types.ObjectId(req.params.taskId) }] },{
        //     task: {
        //         $filter: {
        //             input: "$task",
        //             as: "task",
        //             cond: {
        //                 $in: [
        //                     "$$task._id",
        //                     [
        //                         mongoose.Types.ObjectId(req.params.taskId)
        //                     ]
        //                 ]
        //             }
        //         }
        //     }
        // })
        const data = await Project.updateOne({
            _id: mongoose.Types.ObjectId(req.params.id),
            task: { $elemMatch: { _id: mongoose.Types.ObjectId(req.params.taskId) } }
        }, { $set: { "task.$.title": value.title, "task.$.description": value.description } })
        return res.send(data)
    } catch (error) {
        return res.send(error)
    }

})

api.delete('/project/:id/task/:taskId', async (req, res) => {

    if (!req.params.id || !req.params.taskId) return res.status(500).send(`server error`);

    try {
        const data = await Project.updateOne({ _id: mongoose.Types.ObjectId(req.params.id) }, { $pull: { task: { _id: mongoose.Types.ObjectId(req.params.taskId) } } })
        return res.send(data)
    } catch (error) {
        return res.send(error)
    }

})

api.put('/project/:id/todo', async (req, res) => {
    let todo = []

    for (const key in req.body) {
        // todo.push({ items: req.body[key].items, name: req.body[key]?.name })
        for (const index in req.body[key].items) {
            req.body[key].items[index].stage = req.body[key].name
            todo.push({ name: req.body[key].items[index]._id, stage: req.body[key].items[index].stage, order: index })
        }
    }

    todo.map(async (item) => {
        await Project.updateOne({
            _id: mongoose.Types.ObjectId(req.params.id),
            task: { $elemMatch: { _id: mongoose.Types.ObjectId(item.name) } }
        }, { $set: { "task.$.order": item.order, "task.$.stage": item.stage } })
    })

    res.send(todo)
})

// api.use('/project/:id/task', async (req, res, next) => {
//     if (req.method !== "GET") return next()

//     if (!req.params.id) return res.status(500).send(`server error`);

//     try {
//         const data = await Project.find({ _id: mongoose.Types.ObjectId(req.params.id) }, { task: 1 })
//         return res.send(data)
//     } catch (error) {
//         return res.send(error)
//     }


// })

// api.get('/project/:id/task/:taskId', (req, res) => {
//     res.send(req.params)
// })



// Project Statistics API
api.get('/project/:id/stats', async (req, res) => {
    if (!req.params.id) {
        return res.status(400).send({ error: true, message: 'Project ID is required' });
    }

    try {
        // Convert string ID to ObjectId safely
        let objectId;
        try {
            objectId = new mongoose.Types.ObjectId(req.params.id);
        } catch (idError) {
            return res.status(400).send({ error: true, message: 'Invalid project ID format' });
        }

        // Get the project
        const project = await Project.findById(objectId);
        if (!project) {
            return res.status(404).send({ error: true, message: 'Project not found' });
        }

        // Calculate task statistics
        const tasks = project.task || [];
        const totalTasks = tasks.length;
        
        // Count tasks by status
        const statusCounts = {
            'Requested': 0,
            'To do': 0,
            'In Progress': 0,
            'Done': 0
        };
        
        // Count tasks by priority
        const priorityCounts = {
            'Low': 0,
            'Medium': 0,
            'High': 0,
            'Urgent': 0
        };
        
        // Count overdue tasks and calculate completion percentage
        let completedTasks = 0;
        const today = new Date();
        
        // Process tasks
        tasks.forEach(task => {
            // Count by status
            if (statusCounts.hasOwnProperty(task.stage)) {
                statusCounts[task.stage]++;
            }
            
            // Count by priority
            if (task.priority && priorityCounts.hasOwnProperty(task.priority)) {
                priorityCounts[task.priority]++;
            } else {
                priorityCounts['Medium']++; // Default priority
            }
        });
        
        // Calculate completion percentage
        const completionPercentage = totalTasks > 0 
            ? Math.round((statusCounts['Done'] / totalTasks) * 100) 
            : 0;
        
        // Calculate overdue tasks
        const overdueTasks = tasks.filter(task => 
            task.due_date && new Date(task.due_date) < today && task.stage !== 'Done'
        ).length;
        
        // Return the statistics
        return res.status(200).send({
            projectId: project._id,
            projectTitle: project.title,
            totalTasks: totalTasks,
            statusCounts: statusCounts,
            priorityCounts: priorityCounts,
            completionPercentage: completionPercentage,
            overdueTasks: overdueTasks
        });
        
    } catch (error) {
        console.error('Error fetching project statistics:', error);
        return res.status(500).send({ error: true, message: 'Server error fetching project statistics' })
    }
});

// Add subtasks to a task
api.post('/project/:id/task/:taskId/subtask', async (req, res) => {
    if (!req.params.id || !req.params.taskId) {
        return res.status(400).send({ error: true, message: 'Project ID and Task ID are required' });
    }
    
    const { title } = req.body;
    if (!title) {
        return res.status(400).send({ error: true, message: 'Subtask title is required' });
    }
    
    try {
        // Convert string IDs to ObjectId safely
        let projectId, taskId;
        try {
            projectId = new mongoose.Types.ObjectId(req.params.id);
            taskId = new mongoose.Types.ObjectId(req.params.taskId);
        } catch (idError) {
            return res.status(400).send({ error: true, message: 'Invalid ID format' });
        }
        
        // Find the project and task
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).send({ error: true, message: 'Project not found' });
        }
        
        // Find the specific task
        const taskIndex = project.task.findIndex(t => String(t._id) === String(taskId));
        if (taskIndex === -1) {
            return res.status(404).send({ error: true, message: 'Task not found' });
        }
        
        // Create the subtask
        const newSubtask = {
            title,
            completed: false,
            created_at: new Date(),
            updated_at: new Date()
        };
        
        // Add the subtask to the task
        if (!project.task[taskIndex].subtasks) {
            project.task[taskIndex].subtasks = [];
        }
        
        project.task[taskIndex].subtasks.push(newSubtask);
        
        // Save the updated project
        await project.save();
        
        return res.status(201).send({
            success: true,
            message: 'Subtask added successfully',
            subtask: newSubtask
        });
        
    } catch (error) {
        console.error('Error adding subtask:', error);
        return res.status(500).send({ error: true, message: 'Server error adding subtask' })
    }
});

// Toggle subtask completion status
api.put('/project/:id/task/:taskId/subtask/:subtaskId', async (req, res) => {
    if (!req.params.id || !req.params.taskId || !req.params.subtaskId) {
        return res.status(400).send({ error: true, message: 'Project ID, Task ID, and Subtask ID are required' });
    }
    
    try {
        // Convert string IDs to ObjectId safely
        let projectId, taskId;
        try {
            projectId = new mongoose.Types.ObjectId(req.params.id);
            taskId = new mongoose.Types.ObjectId(req.params.taskId);
        } catch (idError) {
            return res.status(400).send({ error: true, message: 'Invalid ID format' });
        }
        
        // Find the project and task
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).send({ error: true, message: 'Project not found' });
        }
        
        // Find the specific task
        const taskIndex = project.task.findIndex(t => String(t._id) === String(taskId));
        if (taskIndex === -1) {
            return res.status(404).send({ error: true, message: 'Task not found' });
        }
        
        // Find the specific subtask
        const subtasks = project.task[taskIndex].subtasks || [];
        const subtaskIndex = subtasks.findIndex(st => String(st._id) === String(req.params.subtaskId));
        if (subtaskIndex === -1) {
            return res.status(404).send({ error: true, message: 'Subtask not found' });
        }
        
        // Toggle the completion status
        project.task[taskIndex].subtasks[subtaskIndex].completed = !project.task[taskIndex].subtasks[subtaskIndex].completed;
        project.task[taskIndex].subtasks[subtaskIndex].updated_at = new Date();
        
        // Update task progress based on subtasks
        const allSubtasks = project.task[taskIndex].subtasks;
        const completedSubtasks = allSubtasks.filter(st => st.completed).length;
        project.task[taskIndex].progress = Math.round((completedSubtasks / allSubtasks.length) * 100);
        
        // Save the updated project
        await project.save();
        
        return res.status(200).send({
            success: true,
            message: 'Subtask updated successfully',
            completed: project.task[taskIndex].subtasks[subtaskIndex].completed,
            taskProgress: project.task[taskIndex].progress
        });
        
    } catch (error) {
        console.error('Error updating subtask:', error);
        return res.status(500).send({ error: true, message: 'Server error updating subtask' })
    }
});

export default api