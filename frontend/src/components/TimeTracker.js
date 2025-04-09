import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import './TimeTracker.css';

const TimeTracker = ({ projectId, taskId, taskTitle }) => {
    const [timeEntries, setTimeEntries] = useState([]);
    const [activeEntry, setActiveEntry] = useState(null);
    const [description, setDescription] = useState('');
    const [totalTime, setTotalTime] = useState(0);
    const [timer, setTimer] = useState(0);
    const [loading, setLoading] = useState(true);
    const [timerInterval, setTimerInterval] = useState(null);

    useEffect(() => {
        if (projectId && taskId) {
            fetchTimeEntries();
        }
        
        return () => {
            if (timerInterval) {
                clearInterval(timerInterval);
            }
        };
    }, [projectId, taskId]);

    // Load time entries from server
    const fetchTimeEntries = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`http://localhost:9001/api/time/project/${projectId}/task/${taskId}/time`);
            setTimeEntries(response.data.time_entries || []);
            setTotalTime(response.data.total_time_spent || 0);
            
            // Check if there's an active timer (without end_time)
            const active = response.data.time_entries?.find(entry => !entry.end_time);
            if (active) {
                setActiveEntry(active);
                startTimerFromDate(new Date(active.start_time));
            }
            
            setLoading(false);
        } catch (error) {
            console.error('Error fetching time entries:', error);
            toast.error('Failed to load time tracking data');
            setLoading(false);
        }
    };

    // Start timer from a specific date
    const startTimerFromDate = (startDate) => {
        // Clear any existing interval
        if (timerInterval) {
            clearInterval(timerInterval);
        }
        
        // Calculate initial timer value in seconds
        const initialSeconds = Math.floor((Date.now() - startDate.getTime()) / 1000);
        setTimer(initialSeconds);
        
        // Start interval
        const interval = setInterval(() => {
            setTimer(prev => prev + 1);
        }, 1000);
        
        setTimerInterval(interval);
    };

    // Start time tracking
    const startTimer = async () => {
        try {
            const response = await axios.post(`http://localhost:9001/api/time/project/${projectId}/task/${taskId}/time/start`, {
                description: description
            });
            
            setActiveEntry(response.data.time_entry);
            startTimerFromDate(new Date(response.data.time_entry.start_time));
            toast.success('Time tracking started');
            setDescription('');
        } catch (error) {
            console.error('Error starting timer:', error);
            toast.error('Failed to start time tracking');
        }
    };

    // Stop time tracking
    const stopTimer = async () => {
        if (!activeEntry) return;
        
        try {
            const response = await axios.put(`http://localhost:9001/api/time/project/${projectId}/task/${taskId}/time/${activeEntry._id}/stop`);
            
            if (timerInterval) {
                clearInterval(timerInterval);
                setTimerInterval(null);
            }
            
            setActiveEntry(null);
            setTimer(0);
            setTotalTime(response.data.total_time_spent);
            
            // Refresh time entries
            fetchTimeEntries();
            toast.success('Time tracking stopped');
        } catch (error) {
            console.error('Error stopping timer:', error);
            toast.error('Failed to stop time tracking');
        }
    };

    // Delete time entry
    const deleteTimeEntry = async (entryId) => {
        try {
            await axios.delete(`http://localhost:9001/api/time/project/${projectId}/task/${taskId}/time/${entryId}`);
            
            // Refresh time entries
            fetchTimeEntries();
            toast.success('Time entry deleted');
        } catch (error) {
            console.error('Error deleting time entry:', error);
            toast.error('Failed to delete time entry');
        }
    };

    // Format seconds to HH:MM:SS
    const formatTime = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Format minutes to HH:MM
    const formatMinutes = (minutes) => {
        const hrs = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hrs}h ${mins}m`;
    };

    return (
        <div className="time-tracker">
            <h3 className="time-tracker-header">Time Tracking {taskTitle && `- ${taskTitle}`}</h3>
            
            <div className="time-tracker-controls">
                {activeEntry ? (
                    <div className="active-timer">
                        <div className="timer-display">{formatTime(timer)}</div>
                        <button 
                            className="timer-btn timer-stop-btn" 
                            onClick={stopTimer}
                        >
                            Stop
                        </button>
                    </div>
                ) : (
                    <div className="timer-start-form">
                        <input
                            type="text"
                            placeholder="What are you working on? (optional)"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="time-description-input"
                        />
                        <button 
                            className="timer-btn timer-start-btn" 
                            onClick={startTimer}
                        >
                            Start Timer
                        </button>
                    </div>
                )}
            </div>
            
            <div className="time-summary">
                <div className="time-total">
                    <span className="time-label">Total Time:</span>
                    <span className="time-value">{formatMinutes(totalTime)}</span>
                </div>
            </div>
            
            <div className="time-entries-list">
                <h4>Recent Time Entries</h4>
                {loading ? (
                    <div className="time-entries-loading">Loading time entries...</div>
                ) : timeEntries.length === 0 ? (
                    <div className="no-time-entries">No time entries yet</div>
                ) : (
                    <ul>
                        {timeEntries.map(entry => (
                            <li key={entry._id} className="time-entry-item">
                                <div className="time-entry-desc">
                                    {entry.description || "No description"}
                                </div>
                                <div className="time-entry-details">
                                    <span className="time-entry-duration">
                                        {entry.duration 
                                            ? formatMinutes(entry.duration) 
                                            : "In progress..."}
                                    </span>
                                    <span className="time-entry-date">
                                        {new Date(entry.start_time).toLocaleDateString()}
                                    </span>
                                    {entry.end_time && (
                                        <button 
                                            className="time-entry-delete-btn" 
                                            onClick={() => deleteTimeEntry(entry._id)}
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default TimeTracker;
