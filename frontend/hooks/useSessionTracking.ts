import { useState, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/react';
import { API_ENDPOINT } from '../../shared/utils/config';

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

	const startSession = useCallback(async (metadata?: { persona?: string; resume?: string; jd?: string }) => {
		try {
			const token = await getToken();
			if (!token) {
				console.error('[Session] No auth token - user may not be authenticated');
				return null;
			}

			const response = await fetch(API_ENDPOINT('/api/sessions/start'), {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${token}`,
				},
				body: JSON.stringify({
					metadata: {
						startTime: new Date().toISOString(),
						...metadata,
					},
				}),
			});

			if (!response.ok) {
				const errorBody = await response.text();
				console.error('[Session] Failed to start session:', response.status, errorBody);
				return null;
			}

			const data = await response.json();
			const newSessionId = data.sessionId;

			if (!newSessionId) {
				console.error('[Session] No sessionId in response');
				return null;
			}

			setSessionId(newSessionId);
			setIsSessionActive(true);
			questionsBuffer.current = [];

			console.log(`[Session] ✓ Started: ${newSessionId}`);
			return newSessionId;
		} catch (error: any) {
			console.error('[Session] Error:', error.message);
			return null;
		}
	}, [getToken]);

	const updateSession = useCallback(async (question: SessionQuestion) => {
		if (!sessionId) {
			console.warn('[Session] No active session to update');
			return;
		}

		questionsBuffer.current.push(question);

		try {
			const token = await getToken();

			const response = await fetch(API_ENDPOINT(`/api/sessions/${sessionId}`), {
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

	const closeSession = useCallback(async () => {
		if (!sessionId) {
			console.warn('[Session] No active session to close');
			return;
		}

		try {
			const token = await getToken();

			const response = await fetch(API_ENDPOINT(`/api/sessions/${sessionId}/close`), {
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