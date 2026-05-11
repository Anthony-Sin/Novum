
import { sdk } from './tracing.js';
sdk.start();

import express, { Application } from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import process from 'process';
import { getAuth } from 'firebase-admin/auth';
import { initializeWebSocketServer } from './websocket_server.js';
import { abortSession, runSession, deleteProjectAndDependencies } from './firebase_server.js';
import 'dotenv/config';
const app: Application = express();
const port: number = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

const server: http.Server = http.createServer(app);

import { fetchLatestPapers, fetchPaperByDoi } from './lib/coreApi.js';

initializeWebSocketServer(port, server);

app.use(cors());

app.get('/api/latest-papers', async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
        const papers = await fetchLatestPapers(limit);
        res.json(papers);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: String(e) });
    }
});

app.get('/api/search-paper', async (req, res) => {
    try {
        const doi = req.query.doi as string;
        if (!doi) {
            return res.status(400).json({ error: 'Missing doi parameter' });
        }
        const paper = await fetchPaperByDoi(doi);
        res.json(paper);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: String(e) });
    }
});

app.post('/s/run-session', express.json({ type: '*/*' }), (req, res) => {
    try {
        const { sessionId } = req.body;
        if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' });

        const aborted = abortSession(sessionId);
        if (aborted) {
            return res.status(200).json({ status: 'aborted', message: `Investigation ${sessionId} aborted.` });
        } else {
            return res.status(404).json({ status: 'not_found', message: `Investigation ${sessionId} not found.` });
        }
    } catch (e) {
        return res.status(500).json({ error: String(e) });
    }
});

app.delete('/s/delete-project/:projectId', async (req, res) => {
    const projectId = req.params.projectId;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing or invalid token.' });
    }

    const idToken = authHeader.split('Bearer ')[1];

    try {
        const decodedToken = await getAuth().verifyIdToken(idToken);
        const requesterUid = decodedToken.uid;

        await deleteProjectAndDependencies(projectId, requesterUid);
        return res.status(200).json({ status: 'success', message: `Investigation ${projectId} deleted.` });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes("Authorization failed") || errorMessage.includes("not found")) {
            return res.status(403).json({ error: errorMessage });
        }
        if (errorMessage.includes("Firebase ID token")) {
             return res.status(401).json({ error: 'Unauthorized: Invalid token.' });
        }
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

app.use(express.static('web/dist'));
app.get(/.*/, (_req, res) => {
    res.sendFile(path.resolve(process.cwd(), 'web/dist/index.html'));
});

server.listen(port, () => {
  console.log(`?? Novum Forensic API listening at http://localhost:${port}`);
});

