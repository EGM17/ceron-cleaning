const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { google } = require('googleapis');
const cors = require('cors')({ 
  origin: [
    'https://ceron-cleaning.web.app',
    'http://localhost:3000'
  ]
});

admin.initializeApp();

const getOAuth2Client = () => {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        'postmessage'
    );
};

/**
 * Exchange authorization code for tokens
 */
exports.exchangeGoogleCode = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const { code } = req.body;
      
      if (!code) {
        return res.status(400).json({ error: 'Code required' });
      }

      const oauth2Client = getOAuth2Client();
      const { tokens } = await oauth2Client.getToken(code);

      // Save tokens to Firestore
      await admin.firestore().collection('settings').doc('calendar').set({
        providers: {
          google: {
            enabled: true,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiryDate: tokens.expiry_date,
            calendarId: 'primary',
            syncEnabled: true,
            reminderMinutes: [60, 1440]
          }
        },
        defaultProvider: 'google',
        syncInterval: 15,
        autoSync: true,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      res.json({ success: true });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: error.message });
    }
  });
});

/**
 * Get fresh access token using refresh token
 */
exports.getAccessToken = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const settingsDoc = await admin.firestore().collection('settings').doc('calendar').get();
      
      if (!settingsDoc.exists) {
        return res.status(404).json({ error: 'Not configured' });
      }

      const settings = settingsDoc.data();
      const refreshToken = settings.providers?.google?.refreshToken;

      if (!refreshToken) {
        return res.status(400).json({ error: 'No refresh token' });
      }

      const oauth2Client = getOAuth2Client();
      oauth2Client.setCredentials({ refresh_token: refreshToken });

      const { credentials } = await oauth2Client.refreshAccessToken();

      // Update access token in Firestore
      await admin.firestore().collection('settings').doc('calendar').update({
        'providers.google.accessToken': credentials.access_token,
        'providers.google.expiryDate': credentials.expiry_date,
        updatedAt: new Date().toISOString()
      });

      res.json({ 
        accessToken: credentials.access_token,
        expiryDate: credentials.expiry_date
      });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: error.message });
    }
  });
});