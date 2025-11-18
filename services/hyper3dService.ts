import { GenerationResult } from '../types';

const API_KEY = 'vibecoding';
// Updated to strictly match the Python reference: api.hyper3d.com/api/v2
const API_BASE_URL = 'https://api.hyper3d.com/api/v2'; 

type ProgressCallback = (percentage: number, status: string) => void;

/**
 * Handles interaction with Hyper3D Rodin API.
 * Implements the flow: 
 * 1. POST /rodin (Submit)
 * 2. POST /status (Poll with subscription_key)
 * 3. POST /download (Get links with task_uuid)
 */
export const generate3DModel = async (
  file: File, 
  onProgress?: ProgressCallback
): Promise<GenerationResult> => {
  
  console.log('------------------------------------------------');
  console.log('[Hyper3D] generate3DModel initiated');
  console.log(`[Hyper3D] API Base URL: ${API_BASE_URL}`);

  const formData = new FormData();
  // Python reference uses 'images' (plural) and 'tier'
  formData.append('images', file);
  formData.append('tier', 'Sketch');
  // Explicitly request shaded style as per user requirement
  formData.append('style', 'PBR');
  
  try {
    // --- STEP 1: SUBMIT TASK ---
    const submitUrl = `${API_BASE_URL}/rodin`;
    console.log(`[Hyper3D] 1. Submitting Task to: ${submitUrl}`);
    onProgress?.(10, 'Uploading asset...');
    
    const submitResponse = await fetch(submitUrl, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${API_KEY}`,
        // Content-Type is handled automatically by FormData
      },
      body: formData
    });

    if (!submitResponse.ok) {
      const errText = await submitResponse.text();
      throw new Error(`Submission failed (${submitResponse.status}): ${errText}`);
    }

    const submitData = await submitResponse.json();
    console.log('[Hyper3D] Submission Success:', submitData);

    // Correct extraction logic based on logs:
    // The 'uuid' at root is the Task UUID (used for download).
    // The 'jobs.uuids' list contains the actual worker Job UUIDs (used for status polling).
    const taskUuid = submitData.uuid;
    const subscriptionKey = submitData.jobs?.subscription_key;
    const jobUuids = submitData.jobs?.uuids || [];
    
    // We track the first job ID to determine completion status
    const trackingJobId = jobUuids.length > 0 ? jobUuids[0] : null;

    if (!taskUuid || !subscriptionKey || !trackingJobId) {
        throw new Error(`Invalid response structure. Missing uuid, subscription_key, or job uuids. Keys: ${Object.keys(submitData)}`);
    }

    console.log(`[Hyper3D] Task UUID: ${taskUuid}`);
    console.log(`[Hyper3D] Tracking Job UUID: ${trackingJobId}`);
    
    // --- STEP 2: POLL STATUS ---
    let isComplete = false;
    let attempts = 0;
    const maxAttempts = 120; // ~10 minutes (5s interval)

    while (!isComplete && attempts < maxAttempts) {
      attempts++;
      const waitTime = 5000;
      // Simulate progress while waiting
      onProgress?.(Math.min(90, 10 + Math.floor(attempts * 1.5)), 'Processing geometry...');
      
      await new Promise(r => setTimeout(r, waitTime));

      const statusUrl = `${API_BASE_URL}/status`;
      const statusResponse = await fetch(statusUrl, {
        method: 'POST',
        headers: { 
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ subscription_key: subscriptionKey })
      });

      if (!statusResponse.ok) {
        console.warn(`[Hyper3D] Status check ${attempts} failed: ${statusResponse.status}`);
        if (statusResponse.status === 401 || statusResponse.status === 403) {
             throw new Error(`Authorization failed during status check (${statusResponse.status})`);
        }
        // Don't throw on 500/502 immediately, retry
        continue; 
      }

      const statusData = await statusResponse.json();
      const jobs = statusData.jobs || [];
      
      // Find our specific worker job (trackingJobId), NOT the taskUuid
      const jobStatus = jobs.find((j: any) => j.uuid === trackingJobId);
      
      if (jobStatus) {
          const state = jobStatus.status; 
          console.log(`[Hyper3D] Poll ${attempts}: Job ${trackingJobId} is ${state}`);
          
          if (state === 'Done' || state === 'Succeed' || state === 'Complete') {
              isComplete = true;
          } else if (state === 'Failed') {
              throw new Error(`Generation marked as Failed by server (Job: ${trackingJobId}).`);
          }
      } else {
          console.warn(`[Hyper3D] Job ${trackingJobId} not found in status list yet.`);
      }
    }

    if (!isComplete) {
        throw new Error("Operation timed out. The model generation took too long.");
    }

    // --- STEP 3: DOWNLOAD RESULTS (WITH RETRY) ---
    console.log('[Hyper3D] 3. Polling for Download URLs...');
    
    let modelItem = null;
    let allItems = [];
    let downloadAttempts = 0;
    const maxDownloadAttempts = 30; // Retry for ~1.5 minutes
    
    while (!modelItem && downloadAttempts < maxDownloadAttempts) {
        downloadAttempts++;
        // Progress: 90 -> 99
        onProgress?.(90 + Math.min(9, Math.floor(downloadAttempts / 3)), 'Finalizing assets...');
        
        const downloadUrl = `${API_BASE_URL}/download`;
        
        try {
            const downloadResponse = await fetch(downloadUrl, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ task_uuid: taskUuid }) // Use the Bundle/Task UUID here
            });
    
            if (downloadResponse.ok) {
                const downloadData = await downloadResponse.json();
                const items = downloadData.data || downloadData.list || [];
                allItems = items;

                if (Array.isArray(items) && items.length > 0) {
                    // Find the GLB/GLTF file
                    const found = items.find((item: any) => item.name?.toLowerCase().endsWith('.glb')) 
                               || items.find((item: any) => item.name?.toLowerCase().endsWith('.gltf'));
                    
                    if (found) {
                        console.log('[Hyper3D] Model found:', found);
                        modelItem = found;
                        break;
                    } else {
                        console.log(`[Hyper3D] Download poll ${downloadAttempts}: Items exist but no GLB yet.`);
                    }
                } else {
                    console.log(`[Hyper3D] Download poll ${downloadAttempts}: List is empty.`);
                }
            } else {
                console.warn(`[Hyper3D] Download poll ${downloadAttempts} failed with status ${downloadResponse.status}`);
            }
        } catch (dlErr) {
             console.warn(`[Hyper3D] Download poll ${downloadAttempts} exception:`, dlErr);
        }

        // Wait before retry if not found
        if (!modelItem) {
            await new Promise(r => setTimeout(r, 3000));
        }
    }

    if (!modelItem) {
         throw new Error("Job completed but GLB file never appeared in download response.");
    }
    
    // Ensure the URL is HTTPS to avoid mixed content errors in Viewer
    // Also trim whitespace
    const safeUrl = modelItem.url.trim().replace(/^http:\/\//i, 'https://');

    return {
        modelUrl: safeUrl,
        metadata: {
            job_id: taskUuid,
            files: allItems,
            style: 'PBR' // Confirmed style
        }
    };

  } catch (e: any) {
     console.error("[Hyper3D DEBUG] Exception Caught:", e);
     return { error: e.message || "Failed to generate model." };
  }
};