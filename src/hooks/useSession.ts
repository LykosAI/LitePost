import { useState, useEffect } from 'react'
import { Session, Cookie, Header } from '@/types'
import { v4 as uuidv4 } from 'uuid'

const SESSION_STORAGE_KEY = 'litepost_sessions'

export function useSession() {
  const [sessions, setSessions] = useState<Session[]>([])

  useEffect(() => {
    // Load sessions from localStorage
    const savedSessions = localStorage.getItem(SESSION_STORAGE_KEY)
    if (savedSessions) {
      setSessions(JSON.parse(savedSessions))
    }
  }, [])

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions))
  }, [sessions])

  const createSession = (name: string, domain: string, cookies: Cookie[] = [], headers: Header[] = []) => {
    const newSession: Session = {
      id: uuidv4(),
      name,
      domain,
      cookies,
      headers,
      createdAt: new Date(),
      lastUsed: new Date()
    }
    setSessions(prev => [...prev, newSession])
    return newSession
  }

  const updateSession = (sessionId: string, updates: Partial<Session>) => {
    setSessions(prev => prev.map(session => 
      session.id === sessionId 
        ? { ...session, ...updates, lastUsed: new Date() }
        : session
    ))
  }

  const deleteSession = (sessionId: string) => {
    setSessions(prev => prev.filter(session => session.id !== sessionId))
  }

  const getSessionsForDomain = (domain: string) => {
    return sessions.filter(session => session.domain === domain)
  }

  return {
    sessions,
    createSession,
    updateSession,
    deleteSession,
    getSessionsForDomain,
  }
} 