# Firebase Poll Response Utility

This repository contains utility functions for managing poll responses using Firebase Firestore. It provides functionalities to store student poll responses and retrieve poll results.


## Functions

### `storePollResponse(studentId, pollId, responses)`

Stores a student's response to a specific poll in Firestore.

- **`studentId`**: A unique identifier for the student.
- **`pollId`**: A unique identifier for the poll.
- **`responses`**: An array of selected options for the poll.


### `getPollResults(pollId)`

Retrieves all responses for a given poll from Firestore.

- **`pollId`**: A unique identifier for the poll.

**Returns:** An array of objects, where each object represents a student's response to the poll.


