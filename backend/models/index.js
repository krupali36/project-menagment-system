import mongoose from "mongoose";

// Define attachment schema for better structure
const attachmentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: { type: String, required: true },
    url: { type: String, required: true },
    size: { type: Number },
    uploaded_at: { type: Date, default: Date.now }
});

// Define comment schema for task discussion
const commentSchema = new mongoose.Schema({
    content: { type: String, required: true },
    author: { type: String, required: true },
    author_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    created_at: { type: Date, default: Date.now }
});

// Define subtask schema
const subtaskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    completed: { type: Boolean, default: false },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

// Define time entry schema for time tracking
const timeEntrySchema = new mongoose.Schema({
    start_time: { type: Date, required: true },
    end_time: { type: Date },
    duration: { type: Number }, // Duration in minutes
    description: { type: String },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    created_at: { type: Date, default: Date.now }
});

// Define enhanced task schema
const taskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    order: { type: Number, default: 0 },
    stage: { 
        type: String, 
        enum: ["Requested", "To do", "In Progress", "Done"], 
        default: "Requested" 
    },
    index: { type: Number },
    priority: { 
        type: String, 
        enum: ["Low", "Medium", "High", "Urgent"], 
        default: "Medium" 
    },
    due_date: { type: Date },
    assigned_to: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    labels: [{ type: String }],
    subtasks: [subtaskSchema],
    comments: [commentSchema],
    attachments: [attachmentSchema],
    time_entries: [timeEntrySchema],
    total_time_spent: { type: Number, default: 0 }, // Total minutes spent on task
    progress: { type: Number, default: 0 }, // 0-100% completion
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
});

// Define enhanced project schema
const projectSchema = new mongoose.Schema({
    title: {
        type: String,
        unique: true,
        required: true,
        trim: true
    },
    description: { 
        type: String,
        required: true 
    },
    status: {
        type: String,
        enum: ["Planning", "Active", "On Hold", "Completed", "Canceled"],
        default: "Active"
    },
    start_date: { type: Date, default: Date.now },
    end_date: { type: Date },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    team_members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    task: [taskSchema],
    color: { type: String, default: "#4f46e5" }, // Project color for UI
    tags: [{ type: String }],
    is_archived: { type: Boolean, default: false }
}, { timestamps: true });

// Add methods to calculate project progress based on tasks
projectSchema.methods.calculateProgress = function() {
    if (!this.task || this.task.length === 0) return 0;
    
    const completedTasks = this.task.filter(task => task.stage === "Done").length;
    return Math.round((completedTasks / this.task.length) * 100);
};

export default mongoose.model('Project', projectSchema);