# bol_2.6

The branch questions 1, implements the game using the same question answer for each participant in their own browser.

after several iterations the participant hold its answer

a summary of the conversation is created

when all participants finish (hold their questions) a master summary is created


## For the next one


each summary is shared in the browser, showing the summary.


each participant provide feedback to each other participant, until hold their feedback

A summary for each participant is generated when all participants stop

then a summary of each question is generated 

a final summary is provided


## Environment Setup

### Required Environment Variables

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Add your OpenAI API key to the `.env` file:
```
OPENAI_API_KEY=your_actual_openai_api_key_here
```

### Getting an OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in to your account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key and paste it in your `.env` file

### Running the Application

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

This will start both the client (React) and server (Node.js) concurrently.

## Game Features

- **Individual ChatGPT Conversations**: Each player gets a private conversation with an AI life coach
- **Real-time Progress Tracking**: See which players are still conversing and who has finished
- **Unique Names**: Player names and room names must be unique across the server
- **Session Management**: One active tab per browser window, multiple windows allowed
- **Auto-start Conversations**: Conversations begin automatically when entering the game

