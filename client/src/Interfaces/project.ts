import type { Repo } from "./repos"

export type Chat = {
    id: string
    projectId: string,
    userEmail: string,
    message: string,
    pullRequestUrl: string,
    createdAt: string,
    chatUrl: string,
    seen: boolean
}

export type Project = {
    id: string,
    email: string,
    repo: Repo,
    users: string[]
    chats: Chat[]
    requests_available: number
    selected_model: {
        type: string,
        name: string
    } | null
}