import express from 'express';
import { DataManager } from '../data/DataManager';
import { verifyRequestSignature } from '../middleware/security';

const router = express.Router();
const dataManager = new DataManager([
  { id: 'test-data', content: 'Test Hello, World!' },
  { id: 'hello', content: 'Hello, World!' },
  { id: 'welcome', content: 'Welcome to the secure data manager!' },
]);

router.post('/', verifyRequestSignature, async (req, res) => {
  try {
    const { id, data } = req.body;

    const secureData = await dataManager.updateSecureData(id, data);

    res.json({
      id: secureData.id,
      version: secureData.version,
      timestamp: secureData.timestamp,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});
router.get('/:id', verifyRequestSignature, async (req, res) => {
  try {
    const { id } = req.params;
    const secureData = await dataManager.getData(id);

    if (!secureData) {
      return res.status(404).json({ error: 'Data not found' });
    }

    const decrypted = await dataManager.verifyAndDecrypt(id, secureData);
    if (!decrypted) {
      return res.status(400).json({ error: 'Data verification failed' });
    }

    res.json({
      id,
      data: decrypted,
      version: secureData.version,
      timestamp: secureData.timestamp,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/verify/:id', verifyRequestSignature, async (req, res) => {
  try {
    const { id } = req.params;
    const { data } = req.body;

    const secureData = await dataManager.getData(id);
    if (!secureData) {
      return res.status(404).json({ error: 'Data not found' });
    }

    const verified = await dataManager.verifyData(id, data);
    res.json({ valid: verified });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/recover/:id', verifyRequestSignature, async (req, res) => {
  try {
    const { id } = req.params;
    const recovered = await dataManager.recoverData(id);

    if (!recovered) {
      return res.status(404).json({ error: 'No backup found to recover' });
    }

    const decrypted = await dataManager.verifyAndDecrypt(id, recovered);
    if (!decrypted) {
      return res
        .status(400)
        .json({ error: 'Recovered data verification failed' });
    }

    res.json({
      id,
      data: decrypted,
      version: recovered.version,
      timestamp: recovered.timestamp,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/restore/:id', verifyRequestSignature, async (req, res) => {
  try {
    const { id } = req.params;
    const { version } = req.body;

    const restored = await dataManager.restoreVersion(id, version);
    if (!restored) {
      return res
        .status(404)
        .json({ error: 'Version not found or restoration failed' });
    }

    const decrypted = await dataManager.verifyAndDecrypt(id, restored);
    if (!decrypted) {
      return res
        .status(400)
        .json({ error: 'Restored data verification failed' });
    }

    res.json({
      id,
      data: decrypted,
      version: restored.version,
      timestamp: restored.timestamp,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/history/:id', verifyRequestSignature, async (req, res) => {
  try {
    const { id } = req.params;
    const history = await dataManager.getDataHistory(id);

    if (!history || history.length === 0) {
      return res.status(404).json({ error: 'No history found' });
    }

    // Decrypt each history item
    const decryptedHistory = await Promise.all(
      history.map(async (item) => {
        const decryptedData = await dataManager.verifyAndDecrypt(id, item);
        return {
          id: item.id,
          data: decryptedData,
          version: item.version,
          timestamp: item.timestamp,
        };
      })
    );

    // Filter out any items that failed to decrypt
    const validHistory = decryptedHistory
      .filter((item) => item.data !== null)
      .sort((a, b) => b.version - a.version);

    res.json(validHistory);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
