export type PollOption = {
  id: string
  label: string
  text: string
  votes: number
  isCorrect: boolean
}

export type Poll = {
  id: string
  question: string
  status: 'active' | 'closed' | 'draft'
  createdAt: string
  totalResponses: number
  options: PollOption[]
  timeLimit?: number
  topic?: string
}

export const MOCK_POLLS: Poll[] = [
  {
    id: 'poll-1',
    question: 'What is the time complexity of binary search?',
    status: 'closed',
    createdAt: '10:12 AM',
    totalResponses: 34,
    topic: 'Algorithms',
    options: [
      { id: 'a', label: 'A', text: 'O(n)', votes: 4, isCorrect: false },
      { id: 'b', label: 'B', text: 'O(log n)', votes: 24, isCorrect: true },
      { id: 'c', label: 'C', text: 'O(n²)', votes: 3, isCorrect: false },
      { id: 'd', label: 'D', text: 'O(1)', votes: 3, isCorrect: false },
    ],
  },
  {
    id: 'poll-2',
    question: 'Which data structure uses LIFO ordering?',
    status: 'closed',
    createdAt: '10:28 AM',
    totalResponses: 31,
    topic: 'Data Structures',
    options: [
      { id: 'a', label: 'A', text: 'Queue', votes: 5, isCorrect: false },
      { id: 'b', label: 'B', text: 'Linked List', votes: 2, isCorrect: false },
      { id: 'c', label: 'C', text: 'Stack', votes: 22, isCorrect: true },
      { id: 'd', label: 'D', text: 'Heap', votes: 2, isCorrect: false },
    ],
  },
  {
    id: 'poll-3',
    question: 'In a min-heap, where is the smallest element located?',
    status: 'closed',
    createdAt: '10:45 AM',
    totalResponses: 29,
    topic: 'Data Structures',
    options: [
      { id: 'a', label: 'A', text: 'At the root node', votes: 19, isCorrect: true },
      { id: 'b', label: 'B', text: 'At a leaf node', votes: 5, isCorrect: false },
      { id: 'c', label: 'C', text: 'At depth level 2', votes: 3, isCorrect: false },
      { id: 'd', label: 'D', text: 'Depends on insertion order', votes: 2, isCorrect: false },
    ],
  },
  {
    id: 'poll-4',
    question: 'What does DFS stand for in graph traversal?',
    status: 'active',
    createdAt: '11:02 AM',
    totalResponses: 18,
    timeLimit: 60,
    topic: 'Graph Theory',
    options: [
      { id: 'a', label: 'A', text: 'Direct File Search', votes: 2, isCorrect: false },
      { id: 'b', label: 'B', text: 'Depth First Search', votes: 14, isCorrect: true },
      { id: 'c', label: 'C', text: 'Data Flow System', votes: 1, isCorrect: false },
      { id: 'd', label: 'D', text: 'Directed Function Scan', votes: 1, isCorrect: false },
    ],
  },
]

export const CLASS_INFO = {
  name: 'CS 301: Data Structures & Algorithms',
  section: 'Section A — Spring 2025',
  professor: 'Dr. Sarah Chen',
  studentCount: 38,
  code: 'CS301-A',
}
