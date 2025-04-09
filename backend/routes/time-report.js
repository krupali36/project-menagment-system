import express from 'express';
import Task from '../models/task.js';
import { ObjectId } from 'mongodb';

const router = express.Router();

/**
 * @route GET /api/project/:projectId/time-report
 * @desc Get time report for a project
 * @access Public
 */
router.get('/project/:projectId/time-report', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { start, end } = req.query;
        
        let startDate = start ? new Date(start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default to last 30 days
        let endDate = end ? new Date(end) : new Date();
        
        // Set end date to end of day
        endDate.setHours(23, 59, 59, 999);
        
        // Validate projectId
        if (!ObjectId.isValid(projectId)) {
            return res.status(400).json({ error: 'Invalid project ID' });
        }
        
        // Find all tasks for the project
        const tasks = await Task.find({ projectId: ObjectId.createFromHexString(projectId) });
        
        if (!tasks || tasks.length === 0) {
            return res.status(404).json({ error: 'No tasks found for this project' });
        }
        
        // Get project title from the first task
        const projectTitle = tasks[0].projectTitle;
        
        // Initialize the report data
        const report = {
            projectId,
            projectTitle,
            totalTimeSpent: 0,
            totalEntries: 0,
            dailyBreakdown: {},
            taskBreakdown: [],
            userBreakdown: {},
        };
        
        // Process each task's time entries
        for (const task of tasks) {
            if (!task.timeEntries || task.timeEntries.length === 0) continue;
            
            let taskTotalTime = 0;
            
            // Filter time entries within date range
            const filteredEntries = task.timeEntries.filter(entry => {
                const startTime = new Date(entry.start_time);
                return startTime >= startDate && startTime <= endDate && entry.duration;
            });
            
            for (const entry of filteredEntries) {
                // Add to total time
                report.totalTimeSpent += entry.duration || 0;
                taskTotalTime += entry.duration || 0;
                report.totalEntries++;
                
                // Add to date breakdown
                const date = new Date(entry.start_time).toISOString().split('T')[0];
                if (!report.dailyBreakdown[date]) {
                    report.dailyBreakdown[date] = 0;
                }
                report.dailyBreakdown[date] += entry.duration || 0;
                
                // Add to user breakdown (if user info available)
                if (entry.userId) {
                    if (!report.userBreakdown[entry.userId]) {
                        report.userBreakdown[entry.userId] = {
                            total: 0,
                            entries: 0
                        };
                    }
                    report.userBreakdown[entry.userId].total += entry.duration || 0;
                    report.userBreakdown[entry.userId].entries++;
                }
            }
            
            // Add task breakdown if task has time entries
            if (taskTotalTime > 0) {
                report.taskBreakdown.push({
                    taskId: task._id,
                    taskTitle: task.title,
                    totalTime: taskTotalTime,
                    entries: filteredEntries.length,
                    status: task.status
                });
            }
        }
        
        // Sort task breakdown by total time (descending)
        report.taskBreakdown.sort((a, b) => b.totalTime - a.totalTime);
        
        // Convert daily breakdown to array for easier frontend sorting
        const dailyArray = Object.keys(report.dailyBreakdown).map(date => ({
            date,
            time: report.dailyBreakdown[date]
        }));
        report.dailyBreakdown = dailyArray.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        res.json(report);
    } catch (error) {
        console.error('Error generating time report:', error);
        res.status(500).json({ error: 'Server error when generating time report' });
    }
});

export default router;
