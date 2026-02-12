
import { BrainType, LLMFactory } from '../llm/factory';
import { LLMProvider } from '../llm/types';

export interface ProjectIdea {
    id: string;
    title: string;
    description: string;
    difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
    skillsTargeted: string[];
    estimatedDuration: string;
    techStack: string[];
    requirements: string[];
}

export interface ProjectRoadmap {
    projectId: string;
    steps: {
        title: string;
        description: string;
        resources: string[]; // URLs or search terms
        acceptanceCriteria: string[];
    }[];
}

export class ProjectGenerator {
    private llm: LLMProvider;

    constructor(brainType: BrainType = 'local') {
        this.llm = LLMFactory.getProvider(brainType);
    }

    async generateIdea(weakSkills: string[], experienceLevel: string): Promise<ProjectIdea> {
        const prompt = `
        Act as a Senior Engineering Mentor.
        suggest a single, real-world coding project for a ${experienceLevel} engineer to improve these skills: ${weakSkills.join(', ')}.
        The project should solve a practical problem (e.g., CLI tool, unique web app, system utility).
        Avoid generic "To-Do List" apps.
        
        Return STRICT JSON format matching this schema:
        {
            "title": "Project Title",
            "description": "2 sentence pitch",
            "difficulty": "Beginner|Intermediate|Advanced",
            "skillsTargeted": ["Skill1", "Skill2"],
            "estimatedDuration": "2 days",
            "techStack": ["React", "Node.js"],
            "requirements": ["Must use WebSocket", "Must have 90% test coverage"]
        }
        `;

        const json = await this.llm.generateJSON<ProjectIdea>(prompt);
        return { ...json, id: Date.now().toString() };
    }

    async generateRoadmap(projectIdea: ProjectIdea): Promise<ProjectRoadmap> {
        const skills = Array.isArray(projectIdea.skillsTargeted) ? projectIdea.skillsTargeted : [];
        const prompt = `
        Create a step-by-step implementation roadmap for this project:
        Title: ${projectIdea.title || 'Untitled Project'}
        Description: ${projectIdea.description || 'No description provided'}
        Target Skills: ${skills.join(', ')}

        Break it down into 3-5 major milestones.
        For each step, provide:
        1. Title
        2. Description (what to build)
        3. Acceptance Criteria (how to verify it works)
        4. Resources (search terms for docs/tutorials)

        Return STRICT JSON format matching this schema:
        {
            "projectId": "${projectIdea.id}",
            "steps": [
                {
                    "title": "Step 1...",
                    "description": "...",
                    "resources": ["..."],
                    "acceptanceCriteria": ["..."]
                }
            ]
        }
        `;

        return await this.llm.generateJSON<ProjectRoadmap>(prompt);
    }
}
