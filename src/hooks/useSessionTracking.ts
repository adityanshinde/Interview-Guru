import { useState, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/react';

export interface SessionQuestion {
  question: string;
  answer: string[];
  confidence?: number;
  type?: string;
  difficulty?: string;
  timestamp: number;
}

export function useSessionTracking() {
  const { getToken } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const questionsBuffer = useRef<SessionQuestion[]>([]);

  /**
   * Start a new session when interview begins
   */
  const startSession = useCallback(async (metadata?: { persona?: string; resume?: string; jd?: string }) => {
    try {
      console.log('[Session] Starting session creation...');
      
      // Verify token is available
      const token = await getToken();
      if (!token) {
        console.error('[Session] ❌ No auth token available - user may not be authenticated');
        return null;
      }
      console.log('[Session] ✓ Auth token obtained:', token.substring(0, 20) + '...');
      
      const requestBody = {
        metadata: {
          startTime: new Date().toISOString(),
          ...metadata,
        },
      };
      console.log('[Session] Request body:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch('/api/sessions/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      console.log('[Session] Response status:', response.status);
      
      if (!response.ok) {
        const errorBody = await response.text();
        console.error('[Session] ❌ Failed to start session:');
        console.error('  Status:', response.status, response.statusText);
        console.error('  Response:', errorBody);
        return null;
      }

      const data = await response.json();
      console.log('[Session] Response data:', data);
      
      const newSessionId = data.sessionId;
      if (!newSessionId) {
        console.error('[Session] ❌ No sessionId in response:', data);
        return null;
      }
      
      setSessionId(newSessionId);
      setIsSessionActive(true);
      questionsBuffer.current = [];
      
      console.log(`[Session] ✓ Started session: ${newSessionId}`);
      return newSessionId;
    } catch (error: any) {
      console.error('[Session] ❌ Error starting session:', error.message);
      console.error('[Session] Full error:', error);
      return null;
    }
  }, [getToken]);

  /**
   * Update session with a new question+answer after question is detected and answered
   */
  const updateSession = useCallback(async (question: SessionQuestion) => {
    if (!sessionId) {
      console.warn('[Session] No active session to update');
      return;
    }

    questionsBuffer.current.push(question);

    try {
      const token = await getToken();
      
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          questions: questionsBuffer.current,
          lastUpdated: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        console.error(`[Session] Failed to update session ${sessionId}:`, response.statusText);
        return;
      }

      console.log(`[Session] Updated session ${sessionId} with ${questionsBuffer.current.length} questions`);
    } catch (error) {
      console.error('[Session] Error updating session:', error);
    }
  }, [sessionId, getToken]);

  /**
   * Close the current session when interview ends
   */
  const closeSession = useCallback(async () => {
    if (!sessionId) {
      console.warn('[Session] No active session to close');
      return;
    }

    try {
      const token = await getToken();
      
      const response = await fetch(`/api/sessions/${sessionId}/close`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          endTime: new Date().toISOString(),
          questionsAsked: questionsBuffer.current.length,
          totalQuestions: questionsBuffer.current.length,
        }),
      });

      if (!response.ok) {
        console.error(`[Session] Failed to close session ${sessionId}:`, response.statusText);
        return;
      }

      console.log(`[Session] Closed session ${sessionId} with ${questionsBuffer.current.length} questions`);
      
      // Clear session state
      setSessionId(null);
      setIsSessionActive(false);
      questionsBuffer.current = [];
    } catch (error) {
      console.error('[Session] Error closing session:', error);
    }
  }, [sessionId, getToken]);

  return {
    sessionId,
    isSessionActive,
    startSession,
    updateSession,
    closeSession,
  };
}
