import React, { Fragment, useEffect, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import BtnPrimary from './BtnPrimary'
import BtnSecondary from './BtnSecondary'
import axios from 'axios'
import toast from 'react-hot-toast'
import DatePicker from 'react-datepicker'

const AddTaskModal = ({ isAddTaskModalOpen, setAddTaskModal, projectId = null, taskId = null, edit = false, refreshData }) => {

    const [title, setTitle] = useState('')
    const [desc, setDesc] = useState('');
    const [priority, setPriority] = useState('Medium');
    const [dueDate, setDueDate] = useState(null);
    const [labels, setLabels] = useState([]);
    const [labelInput, setLabelInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (edit && isAddTaskModalOpen) {
            axios.get(`http://localhost:9001/api/project/${projectId}/task/${taskId}`)
                .then((res) => {
                    if (res.data && res.data[0] && res.data[0].task && res.data[0].task[0]) {
                        const task = res.data[0].task[0];
                        setTitle(task.title);
                        setDesc(task.description);
                        
                        // Load advanced properties if they exist
                        if (task.priority) setPriority(task.priority);
                        if (task.due_date) setDueDate(new Date(task.due_date));
                        if (task.labels && Array.isArray(task.labels)) setLabels(task.labels);
                    } else {
                        toast.error('Task data is incomplete');
                    }
                })
                .catch((error) => {
                    console.error('Error fetching task:', error);
                    toast.error(error.response?.data?.message || 'Failed to load task');
                });
        } else {
            // Reset form when opening for new task
            if (isAddTaskModalOpen && !edit) {
                setTitle('');
                setDesc('');
                setPriority('Medium');
                setDueDate(null);
                setLabels([]);
                setLabelInput('');
            }
        }
    }, [isAddTaskModalOpen, edit, projectId, taskId]);

    const addLabel = () => {
        if (labelInput.trim() !== '' && !labels.includes(labelInput.trim())) {
            setLabels([...labels, labelInput.trim()]);
            setLabelInput('');
        }
    };

    const removeLabel = (labelToRemove) => {
        setLabels(labels.filter(label => label !== labelToRemove));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        // Create payload with enhanced data
        const taskData = {
            title,
            description: desc,
            priority,
            labels,
            due_date: dueDate
        };
        
        if (!edit) {
            // Create new task
            axios.post(`http://localhost:9001/api/project/${projectId}/task`, taskData)
                .then((res) => {
                    setAddTaskModal(false);
                    toast.success('Task created successfully');
                    // Reset form
                    setTitle('');
                    setDesc('');
                    setPriority('Medium');
                    setDueDate(null);
                    setLabels([]);
                    // Refresh task list
                    if (refreshData) refreshData(true);
                })
                .catch((error) => {
                    console.error('Task creation error:', error);
                    if (error.response?.status === 422) {
                        toast.error(error.response.data.details?.[0]?.message || 'Validation error');
                    } else if (error.response?.data?.message) {
                        toast.error(error.response.data.message);
                    } else {
                        toast.error('Failed to create task. Please try again.');
                    }
                })
                .finally(() => {
                    setIsSubmitting(false);
                });
        } else {
            // Update existing task
            axios.put(`http://localhost:9001/api/project/${projectId}/task/${taskId}`, taskData)
                .then((res) => {
                    setAddTaskModal(false);
                    toast.success('Task updated successfully');
                    // Reset form
                    setTitle('');
                    setDesc('');
                    setPriority('Medium');
                    setDueDate(null);
                    setLabels([]);
                    // Refresh task list
                    if (refreshData) refreshData(true);
                })
                .catch((error) => {
                    console.error('Task update error:', error);
                    if (error.response?.status === 422) {
                        toast.error(error.response.data.details?.[0]?.message || 'Validation error');
                    } else if (error.response?.data?.message) {
                        toast.error(error.response.data.message);
                    } else {
                        toast.error('Failed to update task. Please try again.');
                    }
                })
                .finally(() => {
                    setIsSubmitting(false);
                });
        }
    }

    return (
        <Transition appear show={isAddTaskModalOpen} as={Fragment}>
            <Dialog as='div' open={isAddTaskModalOpen} onClose={() => setAddTaskModal(false)} className="relative z-50">
                <div className="fixed inset-0 overflow-y-auto">
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/30" />
                    </Transition.Child>
                    <div className="fixed inset-0 flex items-center justify-center p-4 w-screen h-screen">
                        {/* <div className="fixed inset-0 "> */}
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="rounded-md bg-white w-6/12">

                                <Dialog.Title as='div' className={'bg-white shadow px-6 py-4 rounded-t-md sticky top-0'}>
                                    {!edit ? (<h1>Add Task</h1>) : (<h1>Edit Task</h1>)}
                                    <button onClick={() => setAddTaskModal(false)} className='absolute right-6 top-4 text-gray-500 hover:bg-gray-100 rounded focus:outline-none focus:ring focus:ring-offset-1 focus:ring-indigo-200 '>
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                                            <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </Dialog.Title>
                                <form onSubmit={handleSubmit} className='gap-4 px-8 py-4'>
                                    <div className='mb-3'>
                                        <label htmlFor="title" className='block text-gray-600'>Title</label>
                                        <input 
                                            value={title} 
                                            onChange={(e) => setTitle(e.target.value)} 
                                            type="text" 
                                            className='border border-gray-300 rounded-md w-full text-sm py-2 px-2.5 focus:border-indigo-500 focus:outline-offset-1 focus:outline-indigo-400' 
                                            placeholder='Task title' 
                                            required
                                        />
                                    </div>
                                    
                                    <div className='mb-3'>
                                        <label htmlFor="Description" className='block text-gray-600'>Description</label>
                                        <textarea 
                                            value={desc} 
                                            onChange={(e) => setDesc(e.target.value)} 
                                            className='border border-gray-300 rounded-md w-full text-sm py-2 px-2.5 focus:border-indigo-500 focus:outline-offset-1 focus:outline-indigo-400' 
                                            rows="4" 
                                            placeholder='Task description'
                                            required
                                        ></textarea>
                                    </div>
                                    
                                    <div className='mb-3'>
                                        <label htmlFor="priority" className='block text-gray-600'>Priority</label>
                                        <select 
                                            value={priority} 
                                            onChange={(e) => setPriority(e.target.value)}
                                            className='border border-gray-300 rounded-md w-full text-sm py-2 px-2.5 focus:border-indigo-500 focus:outline-offset-1 focus:outline-indigo-400'
                                        >
                                            <option value="Low">Low</option>
                                            <option value="Medium">Medium</option>
                                            <option value="High">High</option>
                                            <option value="Urgent">Urgent</option>
                                        </select>
                                    </div>
                                    
                                    <div className='mb-3'>
                                        <label htmlFor="dueDate" className='block text-gray-600'>Due Date</label>
                                        <DatePicker 
                                            selected={dueDate} 
                                            onChange={(date) => setDueDate(date)} 
                                            className='border border-gray-300 rounded-md w-full text-sm py-2 px-2.5 focus:border-indigo-500 focus:outline-offset-1 focus:outline-indigo-400'
                                            placeholderText="Select due date (optional)"
                                            dateFormat="MMMM d, yyyy"
                                            minDate={new Date()}
                                        />
                                    </div>
                                    
                                    <div className='mb-3'>
                                        <label htmlFor="labels" className='block text-gray-600'>Labels</label>
                                        <div className='flex items-center'>
                                            <input 
                                                value={labelInput} 
                                                onChange={(e) => setLabelInput(e.target.value)} 
                                                type="text" 
                                                className='border border-gray-300 rounded-md w-full text-sm py-2 px-2.5 focus:border-indigo-500 focus:outline-offset-1 focus:outline-indigo-400' 
                                                placeholder='Add a label'
                                            />
                                            <button 
                                                type="button" 
                                                onClick={addLabel} 
                                                className='ml-2 bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-2 rounded-md text-sm'
                                            >
                                                Add
                                            </button>
                                        </div>
                                        
                                        <div className='flex flex-wrap gap-2 mt-2'>
                                            {labels.map((label, index) => (
                                                <div key={index} className='bg-indigo-100 text-indigo-800 px-2 py-1 rounded-md text-sm flex items-center'>
                                                    {label}
                                                    <button 
                                                        type="button" 
                                                        onClick={() => removeLabel(label)} 
                                                        className='ml-1 text-indigo-500 hover:text-indigo-700'
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <div className='flex justify-end items-center space-x-2 mt-4'>
                                        <BtnSecondary type="button" onClick={() => setAddTaskModal(false)}>Cancel</BtnSecondary>
                                        <BtnPrimary type="submit" disabled={isSubmitting}>
                                            {isSubmitting ? 'Saving...' : 'Save'}
                                        </BtnPrimary>
                                    </div>
                                </form>

                            </Dialog.Panel>
                        </Transition.Child>

                    </div>
                </div>
            </Dialog>
        </Transition>
    )
}

export default AddTaskModal