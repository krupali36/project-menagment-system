import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import './Reports.css';

const Reports = () => {
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState('');
    const [reportType, setReportType] = useState('progress');
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [dateRange, setDateRange] = useState({ 
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 30 days
        end: new Date().toISOString().split('T')[0] 
    });
    const navigate = useNavigate();

    // Fetch all projects
    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            const response = await axios.get('http://localhost:9001/api/projects/');
            setProjects(response.data);
            if (response.data.length > 0) {
                setSelectedProject(response.data[0]._id);
            }
        } catch (error) {
            console.error('Error fetching projects:', error);
            toast.error('Failed to load projects');
        }
    };

    // Generate report based on selected options
    const generateReport = async () => {
        if (!selectedProject) {
            toast.error('Please select a project');
            return;
        }

        setLoading(true);
        try {
            let reportUrl = '';
            
            switch (reportType) {
                case 'progress':
                    reportUrl = `http://localhost:9001/api/project/${selectedProject}/stats`;
                    break;
                case 'time':
                    reportUrl = `http://localhost:9001/api/project/${selectedProject}/time-report?start=${dateRange.start}&end=${dateRange.end}`;
                    break;
                default:
                    reportUrl = `http://localhost:9001/api/project/${selectedProject}/stats`;
            }
            
            const response = await axios.get(reportUrl);
            setReportData(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error generating report:', error);
            toast.error('Failed to generate report');
            setLoading(false);
        }
    };

    // Format progress data for display
    const formatProgressData = () => {
        if (!reportData) return null;

        return (
            <div className="report-content">
                <h3>Project: {reportData.projectTitle}</h3>
                
                <div className="report-summary">
                    <div className="report-stat">
                        <span className="report-stat-value">{reportData.totalTasks}</span>
                        <span className="report-stat-label">Total Tasks</span>
                    </div>
                    <div className="report-stat">
                        <span className="report-stat-value">{reportData.completionPercentage}%</span>
                        <span className="report-stat-label">Completion</span>
                    </div>
                    <div className="report-stat">
                        <span className="report-stat-value" 
                              style={{ color: reportData.overdueTasks > 0 ? '#F44336' : '#4CAF50' }}>
                            {reportData.overdueTasks}
                        </span>
                        <span className="report-stat-label">Overdue Tasks</span>
                    </div>
                </div>
                
                <div className="report-sections">
                    <div className="report-section">
                        <h4>Tasks by Status</h4>
                        <table className="report-table">
                            <thead>
                                <tr>
                                    <th>Status</th>
                                    <th>Count</th>
                                    <th>Percentage</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(reportData.statusCounts).map(([status, count]) => (
                                    <tr key={status}>
                                        <td>{status}</td>
                                        <td>{count}</td>
                                        <td>{Math.round((count / reportData.totalTasks) * 100) || 0}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    <div className="report-section">
                        <h4>Tasks by Priority</h4>
                        <table className="report-table">
                            <thead>
                                <tr>
                                    <th>Priority</th>
                                    <th>Count</th>
                                    <th>Percentage</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(reportData.priorityCounts).map(([priority, count]) => (
                                    <tr key={priority}>
                                        <td>{priority}</td>
                                        <td>{count}</td>
                                        <td>{Math.round((count / reportData.totalTasks) * 100) || 0}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div className="report-actions">
                    <button 
                        className="view-project-btn"
                        onClick={() => navigate(`/dashboard/${selectedProject}`)}
                    >
                        View Project Dashboard
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className='px-12 py-6 w-full'>
            <div className="reports-container">
                <h2>Project Reports</h2>
                
                <div className="report-options">
                    <div className="option-group">
                        <label htmlFor="project-select">Project:</label>
                        <select 
                            id="project-select" 
                            value={selectedProject}
                            onChange={(e) => setSelectedProject(e.target.value)}
                        >
                            <option value="">Select a project</option>
                            {projects.map(project => (
                                <option key={project._id} value={project._id}>{project.title}</option>
                            ))}
                        </select>
                    </div>
                    
                    <div className="option-group">
                        <label htmlFor="report-type">Report Type:</label>
                        <select 
                            id="report-type" 
                            value={reportType}
                            onChange={(e) => setReportType(e.target.value)}
                        >
                            <option value="progress">Progress Report</option>
                            <option value="time" disabled>Time Tracking Report (Coming Soon)</option>
                        </select>
                    </div>
                    
                    {reportType === 'time' && (
                        <div className="date-range">
                            <div className="option-group">
                                <label htmlFor="start-date">Start Date:</label>
                                <input 
                                    type="date" 
                                    id="start-date"
                                    value={dateRange.start}
                                    onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                                />
                            </div>
                            
                            <div className="option-group">
                                <label htmlFor="end-date">End Date:</label>
                                <input 
                                    type="date" 
                                    id="end-date"
                                    value={dateRange.end}
                                    onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                                />
                            </div>
                        </div>
                    )}
                    
                    <button 
                        className="generate-report-btn"
                        onClick={generateReport}
                        disabled={loading || !selectedProject}
                    >
                        {loading ? 'Generating...' : 'Generate Report'}
                    </button>
                </div>
                
                <div className="report-result">
                    {loading ? (
                        <div className="loading-indicator">Loading report data...</div>
                    ) : reportData ? (
                        formatProgressData()
                    ) : (
                        <div className="no-report">
                            <p>Select a project and report type to generate a report</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Reports;
