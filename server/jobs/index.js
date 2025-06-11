// server.js - Combined Bull queue and Express API
const express = require('express');
const bodyParser = require('body-parser');
const Queue = require('bull');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs-extra');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Configure middleware
app.use(bodyParser.json());

// Create a Bull queue
const translationQueue = new Queue('document-translation', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD
  }
});

// Process translation jobs
translationQueue.process(async (job) => {
  const { docId } = job.data;
  
  job.progress(10);
  console.log(`Processing translation for document: ${docId}`);
  
  return new Promise((resolve, reject) => {
    // Run your translation script
    exec(`node translate.js ${docId}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        return reject(error);
      }
      
      if (stderr) {
        console.error(`Stderr: ${stderr}`);
      }
      
      job.progress(100);
      console.log(`Translation completed: ${stdout}`);
      resolve({ docId, output: stdout });
    });
  });
});

// Handle job completion
translationQueue.on('completed', (job, result) => {
  console.log(`Job ${job.id} completed with result:`, result);
});

// Handle failed jobs
translationQueue.on('failed', (job, error) => {
  console.error(`Job ${job.id} failed with error:`, error);
});

// API Routes

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Submit a translation job
app.post('/api/jobs/translate', async (req, res) => {
  const { docId } = req.body;
  
  if (!docId) {
    return res.status(400).json({ error: 'Missing required parameter: docId' });
  }
  
  try {
    // Add job to the queue
    const job = await translationQueue.add(
      { docId },
      { 
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000
        }
      }
    );
    
    res.status(202).json({
      jobId: job.id,
      docId,
      status: 'queued',
      message: 'Translation job added to queue'
    });
  } catch (error) {
    console.error('Error adding job to queue:', error);
    res.status(500).json({ error: 'Failed to queue job' });
  }
});

// Schedule a translation job
app.post('/api/jobs/schedule', async (req, res) => {
  const { docId, scheduledTime, repeatPattern } = req.body;
  
  if (!docId) {
    return res.status(400).json({ error: 'Missing required parameter: docId' });
  }
  
  try {
    let jobOptions = {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000
      }
    };
    
    // Handle scheduled time
    if (scheduledTime) {
      const delay = new Date(scheduledTime).getTime() - Date.now();
      if (delay > 0) {
        jobOptions.delay = delay;
      }
    }
    
    // Handle recurring jobs
    if (repeatPattern) {
      jobOptions.repeat = {
        cron: repeatPattern // e.g., '0 0 * * *' for daily at midnight
      };
    }
    
    // Add job to the queue
    const job = await translationQueue.add(
      { docId },
      jobOptions
    );
    
    res.status(202).json({
      jobId: job.id,
      docId,
      status: repeatPattern ? 'scheduled-recurring' : 'scheduled',
      scheduledTime: scheduledTime,
      repeatPattern,
      message: 'Translation job scheduled successfully'
    });
  } catch (error) {
    console.error('Error scheduling job:', error);
    res.status(500).json({ error: 'Failed to schedule job' });
  }
});

// Get all jobs
app.get('/api/jobs', async (req, res) => {
  try {
    // Get jobs by status
    const activeJobs = await translationQueue.getActive();
    const waitingJobs = await translationQueue.getWaiting();
    const completedJobs = await translationQueue.getCompleted();
    const failedJobs = await translationQueue.getFailed();
    const delayedJobs = await translationQueue.getDelayed();
    
    // Format jobs for response
    const formatJob = (job, status) => ({
      id: job.id,
      docId: job.data.docId,
      status,
      progress: job.progress(),
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp
    });
    
    const jobs = [
      ...activeJobs.map(job => formatJob(job, 'active')),
      ...waitingJobs.map(job => formatJob(job, 'waiting')),
      ...completedJobs.map(job => formatJob(job, 'completed')),
      ...failedJobs.map(job => formatJob(job, 'failed')),
      ...delayedJobs.map(job => formatJob(job, 'delayed'))
    ];
    
    res.json(jobs);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// Get job by ID
app.get('/api/jobs/:jobId', async (req, res) => {
  const { jobId } = req.params;
  
  try {
    const job = await translationQueue.getJob(jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    // Determine job status
    let status = 'unknown';
    if (await job.isActive()) status = 'active';
    else if (await job.isWaiting()) status = 'waiting';
    else if (await job.isCompleted()) status = 'completed';
    else if (await job.isFailed()) status = 'failed';
    else if (await job.isDelayed()) status = 'delayed';
    
    res.json({
      id: job.id,
      docId: job.data.docId,
      status,
      progress: job.progress(),
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
      finishedOn: job.finishedOn,
      processedOn: job.processedOn,
      returnvalue: job.returnvalue,
      failedReason: job.failedReason
    });
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

// Cancel/remove a job
app.delete('/api/jobs/:jobId', async (req, res) => {
  const { jobId } = req.params;
  
  try {
    const job = await translationQueue.getJob(jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    await job.remove();
    
    res.json({
      id: job.id,
      status: 'removed',
      message: 'Job successfully removed'
    });
  } catch (error) {
    console.error('Error removing job:', error);
    res.status(500).json({ error: 'Failed to remove job' });
  }
});

// Get all recurring jobs
app.get('/api/recurring-jobs', async (req, res) => {
  try {
    const repeatableJobs = await translationQueue.getRepeatableJobs();
    
    res.json(repeatableJobs);
  } catch (error) {
    console.error('Error fetching recurring jobs:', error);
    res.status(500).json({ error: 'Failed to fetch recurring jobs' });
  }
});

// Remove a recurring job
app.delete('/api/recurring-jobs/:jobKey', async (req, res) => {
  const { jobKey } = req.params;
  
  try {
    await translationQueue.removeRepeatableByKey(jobKey);
    
    res.json({
      key: jobKey,
      status: 'removed',
      message: 'Recurring job successfully removed'
    });
  } catch (error) {
    console.error('Error removing recurring job:', error);
    res.status(500).json({ error: 'Failed to remove recurring job' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Translation API server running on port ${PORT}`);
  console.log(`API endpoints:`);
  console.log(`- GET    /api/health - Check server health`);
  console.log(`- POST   /api/jobs/translate - Execute a translation job`);
  console.log(`- POST   /api/jobs/schedule - Schedule a translation job`);
  console.log(`- GET    /api/jobs - List all jobs`);
  console.log(`- GET    /api/jobs/:jobId - Get job status`);
  console.log(`- DELETE /api/jobs/:jobId - Cancel/remove a job`);
  console.log(`- GET    /api/recurring-jobs - List all recurring jobs`);
  console.log(`- DELETE /api/recurring-jobs/:jobKey - Remove a recurring job`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await translationQueue.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await translationQueue.close();
  process.exit(0);
});