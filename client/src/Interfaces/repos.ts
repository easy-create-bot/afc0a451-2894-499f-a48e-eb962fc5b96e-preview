type Repo = {
    id: number,
    name: string,
    full_name: string,
    private: boolean,
    owner: {
        login: string,
        id: number
    }
    html_url: string,
    default_branch: string
}

export type { Repo }