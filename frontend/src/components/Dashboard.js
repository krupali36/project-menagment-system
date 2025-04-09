import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import './Dashboard.css'

const Dashboard = () => {
    const { id } = useParams();
    const [projectStats, setProjectStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (id) {
            fetchProjectStats();
        }
    }, [id]);

    const fetchProjectStats = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`http://localhost:9001/api/project/${id}/stats`);
            setProjectStats(response.data);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching project statistics:', err);
            setError('Failed to load project statistics');
            toast.error('Could not load project statistics');
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="dashboard-loading">Loading project statistics...</div>;
    }

    if (error) {
        return <div className="dashboard-error">{error}</div>;
    }

    if (!projectStats) {
        return <div className="dashboard-error">No project statistics available</div>;
    }

    // Calculate colors for progress bars
    const getStatusColor = (status) => {
        switch (status) {
            case 'Done': return '#4CAF50'; // Green
            case 'In Progress': return '#2196F3'; // Blue
            case 'To do': return '#FF9800'; // Orange
            case 'Requested': return '#9E9E9E'; // Grey
            default: return '#757575';
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'Urgent': return '#F44336'; // Red
            case 'High': return '#FF5722'; // Deep Orange
            case 'Medium': return '#FFC107'; // Amber
            case 'Low': return '#8BC34A'; // Light Green
            default: return '#757575';
        }
    };

    // Get current date for comparison with due dates
    const today = new Date();
    
    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <h1>{projectStats.projectTitle} - Project Dashboard</h1>
                <div className="dashboard-summary">
                    <div className="dashboard-stat">
                        <span className="dashboard-stat-value">{projectStats.totalTasks}</span>
                        <span className="dashboard-stat-label">Total Tasks</span>
                    </div>
                    <div className="dashboard-stat">
                        <span className="dashboard-stat-value">{projectStats.completionPercentage}%</span>
                        <span className="dashboard-stat-label">Completed</span>
                    </div>
                    <div className="dashboard-stat">
                        <span className="dashboard-stat-value" style={{ color: projectStats.overdueTasks > 0 ? '#F44336' : '#4CAF50' }}>
                            {projectStats.overdueTasks}
                        </span>
                        <span className="dashboard-stat-label">Overdue</span>
                    </div>
                </div>
            </div>

            <div className="dashboard-charts">
                <div className="dashboard-chart-container">
                    <h2>Tasks by Status</h2>
                    <div className="status-bars">
                        {Object.entries(projectStats.statusCounts).map(([status, count]) => (
                            <div className="status-bar-container" key={status}>
                                <div className="status-bar-label">
                                    <span>{status}</span>
                                    <span>{count}</span>
                                </div>
                                <div className="status-bar-bg">
                                    <div 
                                        className="status-bar-fill" 
                                        style={{ 
                                            width: `${projectStats.totalTasks ? (count / projectStats.totalTasks) * 100 : 0}%`,
                                            backgroundColor: getStatusColor(status)
                                        }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="dashboard-chart-container">
                    <h2>Tasks by Priority</h2>
                    <div className="priority-bars">
                        {Object.entries(projectStats.priorityCounts).map(([priority, count]) => (
                            <div className="priority-bar-container" key={priority}>
                                <div className="priority-bar-label">
                                    <span>{priority}</span>
                                    <span>{count}</span>
                                </div>
                                <div className="priority-bar-bg">
                                    <div 
                                        className="priority-bar-fill" 
                                        style={{ 
                                            width: `${projectStats.totalTasks ? (count / projectStats.totalTasks) * 100 : 0}%`,
                                            backgroundColor: getPriorityColor(priority)
                                        }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="dashboard-progress">
                <h2>Overall Project Progress</h2>
                <div className="progress-container">
                    <div className="progress-bar-bg">
                        <div 
                            className="progress-bar-fill" 
                            style={{ width: `${projectStats.completionPercentage}%` }}
                        ></div>
                    </div>
                    <div className="progress-percentage">{projectStats.completionPercentage}%</div>
                </div>
            </div>

            <div className="dashboard-actions">
                <button className="dashboard-refresh-btn" onClick={fetchProjectStats}>
                    Refresh Statistics
                </button>
            </div>
        </div>
    );
};

export default Dashboard;
