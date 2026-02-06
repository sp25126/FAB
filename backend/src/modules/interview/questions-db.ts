export interface QuestionTemplate {
    skill: string;
    difficulty: 'easy' | 'medium' | 'hard';
    question: string;
    followUps: string[];
    redFlags: string[]; // Words that indicate weak understanding
}

export const QUESTION_DATABASE: QuestionTemplate[] = [
    // React Questions
    {
        skill: 'react',
        difficulty: 'easy',
        question: "You mentioned React on your resume. Walk me through how React's virtual DOM works.",
        followUps: [
            "How does React decide when to re-render a component?",
            "What's the difference between controlled and uncontrolled components?",
            "When would you use useEffect vs useLayoutEffect?"
        ],
        redFlags: ['basically', 'kind of', 'i think', 'something like', 'similar to']
    },
    {
        skill: 'react',
        difficulty: 'medium',
        question: "In your project, how did you handle state management? Why did you choose that approach?",
        followUps: [
            "What problems did you face with prop drilling?",
            "How would you optimize re-renders in a large component tree?",
            "Explain the difference between Redux and Context API in your use case."
        ],
        redFlags: ['just used', 'followed tutorial', 'copy pasted']
    },

    // Node.js Questions
    {
        skill: 'node.js',
        difficulty: 'easy',
        question: "You listed Node.js as a skill. Explain the event loop in Node.js.",
        followUps: [
            "What's the difference between process.nextTick and setImmediate?",
            "How does Node.js handle blocking operations?",
            "What's the purpose of the cluster module?"
        ],
        redFlags: ['asynchronous', 'non-blocking', 'javascript runtime']
    },
    {
        skill: 'node.js',
        difficulty: 'hard',
        question: "How would you handle a memory leak in a Node.js production application?",
        followUps: [
            "What tools would you use to profile memory usage?",
            "How do you identify which part of your code is leaking?",
            "What's the difference between heap memory and stack memory?"
        ],
        redFlags: ['restart server', 'never had', 'not sure']
    },

    // Docker Questions
    {
        skill: 'docker',
        difficulty: 'easy',
        question: "You mentioned Docker. What's the difference between a container and an image?",
        followUps: [
            "How do you optimize Docker image size?",
            "What's the difference between COPY and ADD in a Dockerfile?",
            "Explain Docker layers and caching."
        ],
        redFlags: ['virtualization', 'like a VM', 'packages everything']
    },

    // REST API Questions
    {
        skill: 'rest api',
        difficulty: 'medium',
        question: "You've built REST APIs. When would you use PUT vs PATCH?",
        followUps: [
            "How do you handle API versioning?",
            "What's idempotency and why does it matter?",
            "How do you secure your API endpoints?"
        ],
        redFlags: ['crud operations', 'endpoints', 'json']
    },

    // Database Questions
    {
        skill: 'mongodb',
        difficulty: 'medium',
        question: "How do you design a schema in MongoDB for a one-to-many relationship?",
        followUps: [
            "When would you embed vs reference documents?",
            "How do you handle data consistency in MongoDB?",
            "What indexes would you create and why?"
        ],
        redFlags: ['nosql', 'flexible', 'json documents']
    },
    {
        skill: 'sql',
        difficulty: 'medium',
        question: "Explain the difference between a LEFT JOIN and an INNER JOIN.",
        followUps: [
            "When would you use a CROSS JOIN?",
            "What is a subquery and when is it less efficient than a JOIN?",
            "Explain the concept of database normalization up to 3NF."
        ],
        redFlags: ['tables', 'rows', 'columns', 'link']
    },

    // Python Questions
    {
        skill: 'python',
        difficulty: 'easy',
        question: "Explain the difference between a list and a tuple in Python.",
        followUps: [
            "When would you use a tuple over a list?",
            "What's the difference between shallow and deep copy?",
            "How does Python's garbage collection work?"
        ],
        redFlags: ['mutable', 'immutable', 'basically the same']
    },

    // Machine Learning Questions
    {
        skill: 'machine learning',
        difficulty: 'hard',
        question: "You mentioned Machine Learning. Explain the bias-variance tradeoff.",
        followUps: [
            "How do you detect overfitting in your model?",
            "What's the difference between L1 and L2 regularization?",
            "When would you use cross-validation?"
        ],
        redFlags: ['ai', 'predictions', 'algorithms', 'training data']
    },

    // Git Questions
    {
        skill: 'git',
        difficulty: 'medium',
        question: "How do you resolve a merge conflict in Git?",
        followUps: [
            "What's the difference between rebase and merge?",
            "When would you use git cherry-pick?",
            "How do you undo a commit that's already pushed?"
        ],
        redFlags: ['version control', 'save code', 'branches']
    },

    // Java Questions
    {
        skill: 'java',
        difficulty: 'medium',
        question: "Explain the difference between HashMap and ConcurrentHashMap in Java.",
        followUps: [
            "How does the 'synchronized' keyword work?",
            "What are Java Streams and when should you avoid them?",
            "Explain the Java Memory Model (JVM Heap vs Stack)."
        ],
        redFlags: ['dictionary', 'list', 'i think']
    },

    // TypeScript Questions
    {
        skill: 'typescript',
        difficulty: 'medium',
        question: "What is the difference between an 'interface' and a 'type' in TypeScript?",
        followUps: [
            "What are generics and why are they useful?",
            "Explain 'lookup types' and 'mapped types'.",
            "How does 'unknown' differ from 'any'?"
        ],
        redFlags: ['classes', 'objects', 'definitions']
    },

    // C++ Questions
    {
        skill: 'c++',
        difficulty: 'hard',
        question: "Explain RAII (Resource Acquisition Is Initialization) in C++.",
        followUps: [
            "What's the difference between a pointer and a reference?",
            "Explain smart pointers (unique_ptr, shared_ptr) and how they prevent leaks.",
            "What is the VTable and how does dynamic dispatch work?"
        ],
        redFlags: ['memory', 'malloc', 'free']
    },

    // AWS Questions
    {
        skill: 'aws',
        difficulty: 'medium',
        question: "How would you design a highly available architecture for a web app on AWS?",
        followUps: [
            "What is the difference between an Application Load Balancer and a Network Load Balancer?",
            "How does S3 versioning work?",
            "Explain the Shared Responsibility Model."
        ],
        redFlags: ['cloud', 'amazon', 'hosting']
    },

    // Kubernetes Questions
    {
        skill: 'kubernetes',
        difficulty: 'hard',
        question: "Explain the lifecycle of a Pod in Kubernetes.",
        followUps: [
            "What is the difference between a Deployment and a StatefulSet?",
            "How do Services (ClusterIP vs NodePort) work in K8s?",
            "Explain Ingress Controllers and how they route traffic."
        ],
        redFlags: ['containers', 'scaling', 'orchestration']
    },

    // CI/CD Questions
    {
        skill: 'ci/cd',
        difficulty: 'medium',
        question: "What's the difference between Continuous Delivery and Continuous Deployment?",
        followUps: [
            "Explain how a typical CI/CD pipeline looks for a microservices app.",
            "What is 'Build Once, Deploy Many'?",
            "How do you handle rollbacks in a CI/CD process?"
        ],
        redFlags: ['automation', 'jenkins', 'github actions']
    },

    // CSS/Tailwind Questions
    {
        skill: 'css',
        difficulty: 'medium',
        question: "Explain the CSS Box Model and how 'box-sizing: border-box' changes it.",
        followUps: [
            "What's the difference between Flexbox and CSS Grid?",
            "How do CSS Variables (Custom Properties) differ from SASS variables?",
            "Explain specificity and how to avoid using !important."
        ],
        redFlags: ['styling', 'colors', 'design']
    },

    // Agile Questions
    {
        skill: 'agile',
        difficulty: 'easy',
        question: "What is a 'Sprint' in Scrum, and what happens in a Daily Standup?",
        followUps: [
            "How do you estimate tasks (Story Points)?",
            "What is a 'Definition of Done'?",
            "What's the role of a Scrum Master vs a Product Owner?"
        ],
        redFlags: ['meetings', 'updates', 'talking']
    },

    // Linux/Bash Questions
    {
        skill: 'linux',
        difficulty: 'medium',
        question: "What is the difference between a symbolic link (soft link) and a hard link in Linux?",
        followUps: [
            "How do you check for running processes and kill one?",
            "Explain the file permission structure (chmod 755).",
            "What's the purpose of the /etc/hosts file?"
        ],
        redFlags: ['operating system', 'terminal', 'commands']
    }
];

export function getQuestionsForSkill(skill: string, difficulty?: string): QuestionTemplate[] {
    const normalized = skill.toLowerCase();
    return QUESTION_DATABASE.filter(q =>
        q.skill === normalized &&
        (!difficulty || q.difficulty === difficulty)
    );
}

export function getQuestionsByDifficulty(skills: string[], difficulty: 'easy' | 'medium' | 'hard'): QuestionTemplate[] {
    return skills.flatMap(skill =>
        getQuestionsForSkill(skill, difficulty)
    );
}
