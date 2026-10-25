export type Company = { name: string; role: string; period: string; logo: string }
export type Education = { institution: string; degree: string; major: string; period: string }
export type Project = { title: string; description: string; url: string; image: string }

export interface Portfolio {
  name: string
  title: string
  bio: string
  photo: string
  companies: Company[]
  education: Education[]
  projects: Project[]
  stack: string[]
  contact: { email: string; github: string; linkedin: string }
}

export type Account = { name: string; email: string }
