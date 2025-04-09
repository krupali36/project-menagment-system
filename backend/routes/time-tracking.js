import express from 'express';
import mongoose from 'mongoose';
import Project from '../models/index.js';

const timeTracking = express.Router();

// Start time tracking for a task
timeTracking.post('/project/:projectId/task/:taskId/time/start', async (req, res) => {
    try {
        const { projectId, taskId } = req.params;
        const { description, userId } = req.body;
        
        // Validate IDs
        if (!mongoose.Types.ObjectId.isValid(projectId) || !mongoose.Types.ObjectId.isValid(taskId)) {
            return res.status(400).send({ error: true, message: 'Invalid project or task ID format' });
        }
        
        // Create new time entry
        const timeEntry = {
            _id: new mongoose.Types.ObjectId(),
            start_time: new Date(),
            description,
            user_id: userId ? new mongoose.Types.ObjectId(userId) : null
        };
        
        // Update the project document to add the time entry to the task
        const project = await Project.findOneAndUpdate(
            { 
                _id: mongoose.Types.ObjectId(projectId),
                "task._id": mongoose.Types.ObjectId(taskId)
            },
            { 
                $push: { "task.$.time_entries": timeEntry } 
            },
            { new: true }
        );
        
        if (!project) {
            return res.status(404).send({ error: true, message: 'Project or task not found' });
        }
        
        // Return the new time entry
        return res.status(201).send({
            message: 'Time tracking started',
            time_entry: timeEntry
        });
        
    } catch (error) {
        console.error('Error starting time tracking:', error);
        return res.status(500).send({ error: true, message: 'Server error starting time tracking' });
    }
});

// Stop time tracking for a task
timeTracking.put('/project/:projectId/task/:taskId/time/:timeEntryId/stop', async (req, res) => {
    try {
        const { projectId, taskId, timeEntryId } = req.params;
        
        // Validate IDs
        if (!mongoose.Types.ObjectId.isValid(projectId) || 
            !mongoose.Types.ObjectId.isValid(taskId) || 
            !mongoose.Types.ObjectId.isValid(timeEntryId)) {
            return res.status(400).send({ error: true, message: 'Invalid ID format' });
        }
        
        // Find the project
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).send({ error: true, message: 'Project not found' });
        }
        
        // Find the task
        const task = project.task.id(taskId);
        if (!task) {
            return res.status(404).send({ error: true, message: 'Task not found' });
        }
        
        // Find the time entry
        const timeEntry = task.time_entries.id(timeEntryId);
        if (!timeEntry) {
            return res.status(404).send({ error: true, message: 'Time entry not found' });
        }
        
        // Update the time entry
        const endTime = new Date();
        timeEntry.end_time = endTime;
        
        // Calculate duration in minutes
        const durationMs = endTime - timeEntry.start_time;
        const durationMinutes = Math.round(durationMs / (1000 * 60));
        timeEntry.duration = durationMinutes;
        
        // Update the total time spent on the task
        task.total_time_spent = (task.total_time_spent || 0) + durationMinutes;
        
        // Save the updated project
        await project.save();
        
        return res.status(200).send({
            message: 'Time tracking stopped',
            time_entry: timeEntry,
            total_time_spent: task.total_time_spent
        });
        
    } catch (error) {
        console.error('Error stopping time tracking:', error);
        return res.status(500).send({ error: true, message: 'Server error stopping time tracking' });
    }
});

// Get all time entries for a task
timeTracking.get('/project/:projectId/task/:taskId/time', async (req, res) => {
    try {
        const { projectId, taskId } = req.params;
        
        // Validate IDs
        if (!mongoose.Types.ObjectId.isValid(projectId) || !mongoose.Types.ObjectId.isValid(taskId)) {
            return res.status(400).send({ error: true, message: 'Invalid project or task ID format' });
        }
        
        // Get project with specific task data
        const project = await Project.findOne(
            { 
                _id: mongoose.Types.ObjectId(projectId),
                "task._id": mongoose.Types.ObjectId(taskId)
            },
            { "task.$": 1 }
        );
        
        if (!project || !project.task || project.task.length === 0) {
            return res.status(404).send({ error: true, message: 'Project or task not found' });
        }
        
        const task = project.task[0];
        
        return res.status(200).send({
            task_id: task._id,
            task_title: task.title,
            time_entries: task.time_entries || [],
            total_time_spent: task.total_time_spent || 0
        });
        
    } catch (error) {
        console.error('Error fetching time entries:', error);
        return res.status(500).send({ error: true, message: 'Server error fetching time entries' });
    }
});

// Delete a time entry
timeTracking.delete('/project/:projectId/task/:taskId/time/:timeEntryId', async (req, res) => {
    try {
        const { projectId, taskId, timeEntryId } = req.params;
        
        // Validate IDs
        if (!mongoose.Types.ObjectId.isValid(projectId) || 
            !mongoose.Types.ObjectId.isValid(taskId) || 
            !mongoose.Types.ObjectId.isValid(timeEntryId)) {
            return res.status(400).send({ error: true, message: 'Invalid ID format' });
        }
        
        // Find the project
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).send({ error: true, message: 'Project not found' });
        }
        
        // Find the task
        const task = project.task.id(taskId);
        if (!task) {
            return res.status(404).send({ error: true, message: 'Task not found' });
        }
        
        // Find the time entry
        const timeEntry = task.time_entries.id(timeEntryId);
        if (!timeEntry) {
            return res.status(404).send({ error: true, message: 'Time entry not found' });
        }
        
        // If the time entry has a duration, subtract it from the total time spent
        if (timeEntry.duration) {
            task.total_time_spent = Math.max(0, (task.total_time_spent || 0) - timeEntry.duration);
        }
        
        // Remove the time entry
        task.time_entries.pull(timeEntryId);
        
        // Save the updated project
        await project.save();
        
        return res.status(200).send({
            message: 'Time entry deleted',
            total_time_spent: task.total_time_spent
        });
        
    } catch (error) {
        console.error('Error deleting time entry:', error);
        return res.status(500).send({ error: true, message: 'Server error deleting time entry' });
    }
});

export default timeTracking;
