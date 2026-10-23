import { Router, Request, Response, NextFunction } from 'express';
import {
  IncidentInputPayloadSchema,
  IncidentRecordSchema,
  DEMO_SCENARIOS
} from '@sahaaysetu/shared';
import { incidentStore } from '../storage/incidentStore';
import { analyzeIncident } from '../services/gemini';
import { aiRateLimiter, upload } from '../middleware/security';

export const incidentsRouter = Router();

// GET all demonstration scenarios
incidentsRouter.get('/demos', (_req: Request, res: Response) => {
  res.json({
    success: true,
    scenarios: DEMO_SCENARIOS
  });
});

// GET all incidents (with filtering and search)
incidentsRouter.get('/', (req: Request, res: Response) => {
  const { category, urgency, search } = req.query;
  const list = incidentStore.getAll({
    category: typeof category === 'string' ? category : undefined,
    urgency: typeof urgency === 'string' ? urgency : undefined,
    search: typeof search === 'string' ? search : undefined
  });
  res.json({
    success: true,
    total: list.length,
    incidents: list
  });
});

// GET single incident
incidentsRouter.get('/:id', (req: Request, res: Response) => {
  const id = String(req.params.id);
  const incident = incidentStore.getById(id);
  if (!incident) {
    return res.status(404).json({ success: false, error: 'Incident not found' });
  }
  res.json({ success: true, incident });
});

// POST analyze an incident (supports JSON or multipart with image file)
incidentsRouter.post(
  '/analyze',
  aiRateLimiter,
  upload.single('image'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let bodyData = req.body;
      // Handle stringified form fields if sent as multipart
      if (typeof bodyData.consentGivenForMedical === 'string') {
        bodyData.consentGivenForMedical = bodyData.consentGivenForMedical === 'true';
      }
      if (typeof bodyData.consentGivenForLocation === 'string') {
        bodyData.consentGivenForLocation = bodyData.consentGivenForLocation === 'true';
      }

      // If an image was uploaded, attach base64 representation
      if (req.file) {
        bodyData.imageBase64 = req.file.buffer.toString('base64');
        bodyData.imageMimeType = req.file.mimetype;
        bodyData.imageName = req.file.originalname;
      }

      // Validate input payload with Zod
      const validatedPayload = IncidentInputPayloadSchema.parse(bodyData);

      // Perform analysis via Gemini service (or deterministic demo engine)
      const analyzedRecord = await analyzeIncident(validatedPayload);

      // Save to store
      const savedRecord = incidentStore.save(analyzedRecord);

      res.status(201).json({
        success: true,
        incident: savedRecord,
        possibleDuplicates: savedRecord.possibleDuplicates
      });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH update reviewed facts, location, or action items
incidentsRouter.patch('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const existing = incidentStore.getById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Incident not found' });
    }

    const updated = incidentStore.update(id, req.body);
    res.json({ success: true, incident: updated });
  } catch (err) {
    next(err);
  }
});

// POST export Responder Brief
incidentsRouter.post('/:id/brief', (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const { scrubMedical, scrubLocation } = req.body;
    const brief = incidentStore.generateResponderBrief(id, {
      scrubMedical: Boolean(scrubMedical),
      scrubLocation: Boolean(scrubLocation)
    });
    if (!brief) {
      return res.status(404).json({ success: false, error: 'Incident not found' });
    }
    res.json({ success: true, brief });
  } catch (err) {
    next(err);
  }
});

// DELETE single incident
incidentsRouter.delete('/:id', (req: Request, res: Response) => {
  const id = String(req.params.id);
  const deleted = incidentStore.delete(id);
  if (!deleted) {
    return res.status(404).json({ success: false, error: 'Incident not found' });
  }
  res.json({ success: true, message: 'Incident deleted successfully' });
});

// POST clear all user-created incidents (Privacy reset)
incidentsRouter.post('/clear-all', (_req: Request, res: Response) => {
  const count = incidentStore.clearUserData();
  res.json({
    success: true,
    message: `All user-created data (${count} records) successfully cleared from session.`
  });
});
