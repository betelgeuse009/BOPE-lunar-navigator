import { useEffect, useState } from 'react'
import { TOPICS, type TopicId } from './topics'

const ids = Object.keys(TOPICS) as TopicId[]

// The topic named in the address (#/docs/<topic>), or null when the navigator itself is shown.
export function useDocTopic(): TopicId | null {
  const read = () => {
    const m = /^#\/docs\/?([\w-]*)/.exec(window.location.hash)
    return m ? (ids.includes(m[1] as TopicId) ? (m[1] as TopicId) : ids[0]) : null
  }
  const [topic, setTopic] = useState(read)
  useEffect(() => {
    const on = () => setTopic(read())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return topic
}
