
import fs from 'fs/promises';
import path from 'path';

export interface UserProfile {
    username: string;
    bio: string;
    goals: string[];
    experienceLevel: 'Junior' | 'Mid' | 'Senior' | 'Lead';
    targetRole: string;
    completedProjects: string[]; // IDs of completed AI challenges
    skills: Record<string, number>; // Skill name -> Level (0-100)
    lastActive: string;
    avatarUrl?: string; // GitHub Avatar
    githubUrl?: string; // GitHub Profile Link
    name?: string; // Real Name
}

export class ProfileStorage {
    private dataDir = path.join(process.cwd(), 'data', 'profiles');
    private filePath: string;

    constructor(username: string) {
        this.filePath = path.join(this.dataDir, `${username}.json`);
    }

    private async ensureDataDir(): Promise<void> {
        try {
            await fs.mkdir(this.dataDir, { recursive: true });
        } catch (e) {
            // Ignore if exists
        }
    }

    async getProfile(): Promise<UserProfile> {
        try {
            await this.ensureDataDir();
            const data = await fs.readFile(this.filePath, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            // Return default profile if not found
            return {
                username: path.basename(this.filePath, '.json'),
                bio: '',
                goals: [],
                experienceLevel: 'Junior',
                targetRole: 'Software Engineer',
                completedProjects: [],
                skills: {},
                lastActive: new Date().toISOString()
            };
        }
    }

    async saveProfile(profile: Partial<UserProfile>): Promise<UserProfile> {
        await this.ensureDataDir();
        const current = await this.getProfile();
        const updated = { ...current, ...profile, lastActive: new Date().toISOString() };
        await fs.writeFile(this.filePath, JSON.stringify(updated, null, 2));
        return updated;
    }
}
