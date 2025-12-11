const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Resetting existing data...');
  await prisma.jobCandidate.deleteMany();
  await prisma.job.deleteMany();
  await prisma.candidate.deleteMany();
  await prisma.user.deleteMany();

  console.log('Creating demo users...');
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const hiringManager = await prisma.user.create({
    data: {
      email: 'hiring.manager@example.com',
      passwordHash,
      name: 'Avery Hiring',
      companyName: 'HireFlow Labs',
    },
  });

  const recruiter = await prisma.user.create({
    data: {
      email: 'recruiter@example.com',
      passwordHash,
      name: 'Riley Recruiter',
      companyName: 'Talent Forge',
    },
  });

  console.log('Seeding jobs for HireFlow Labs...');
  const backendJob = await prisma.job.create({
    data: {
      userId: hiringManager.id,
      title: 'Senior Backend Engineer',
      company: 'HireFlow Labs',
      location: 'Remote',
      seniority: 'Senior',
      salaryMin: 140000,
      salaryMax: 180000,
      description: 'Lead backend development for resume intelligence features.',
      requiredSkills: ['Node.js', 'TypeScript', 'PostgreSQL', 'Prisma'],
      niceToHaveSkills: ['AWS', 'Docker', 'Kafka'],
    },
  });

  const frontendJob = await prisma.job.create({
    data: {
      userId: hiringManager.id,
      title: 'Product Designer',
      company: 'HireFlow Labs',
      location: 'New York, NY (Hybrid)',
      seniority: 'Mid-level',
      salaryMin: 95000,
      salaryMax: 125000,
      description: 'Own end-to-end design for recruiter and candidate experiences.',
      requiredSkills: ['Figma', 'User research', 'Design systems'],
      niceToHaveSkills: ['Prototyping', 'HTML/CSS'],
    },
  });

  const recruiterJob = await prisma.job.create({
    data: {
      userId: recruiter.id,
      title: 'Technical Recruiter',
      company: 'Talent Forge',
      location: 'Austin, TX',
      seniority: 'Mid-level',
      salaryMin: 80000,
      salaryMax: 105000,
      description: 'Source and manage candidates for high-growth startups.',
      requiredSkills: ['Sourcing', 'ATS management', 'Technical screening'],
      niceToHaveSkills: ['Salesforce', 'Greenhouse', 'LinkedIn Recruiter'],
    },
  });

  console.log('Seeding candidates for HireFlow Labs...');
  const candidates = await Promise.all([
    prisma.candidate.create({
      data: {
        userId: hiringManager.id,
        fullName: 'Jordan Winters',
        email: 'jordan.winters@example.com',
        phone: '+1-555-0101',
        location: 'Seattle, WA',
        resumeUrl: 'https://example.com/resumes/jordan.pdf',
        summary: 'Backend engineer with distributed systems expertise.',
        skills: ['Node.js', 'TypeScript', 'Kafka', 'AWS', 'PostgreSQL'],
        experience: [
          {
            company: 'Cloudscale',
            title: 'Backend Engineer',
            years: 3,
          },
          {
            company: 'DataLoop',
            title: 'Software Engineer',
            years: 2,
          },
        ],
        education: [
          {
            school: 'University of Washington',
            degree: 'B.S. Computer Science',
            graduationYear: 2018,
          },
        ],
      },
    }),
    prisma.candidate.create({
      data: {
        userId: hiringManager.id,
        fullName: 'Casey Rivers',
        email: 'casey.rivers@example.com',
        phone: '+1-555-0102',
        location: 'Remote',
        resumeUrl: 'https://example.com/resumes/casey.pdf',
        summary: 'Product designer focused on accessibility and design systems.',
        skills: ['Figma', 'Design systems', 'Accessibility', 'Prototyping'],
        experience: [
          {
            company: 'Creative Labs',
            title: 'Product Designer',
            years: 4,
          },
        ],
        education: [
          {
            school: 'Parsons School of Design',
            degree: 'BFA Design',
            graduationYear: 2016,
          },
        ],
      },
    }),
    prisma.candidate.create({
      data: {
        userId: hiringManager.id,
        fullName: 'Taylor Hughes',
        email: 'taylor.hughes@example.com',
        phone: '+1-555-0103',
        location: 'Denver, CO',
        resumeUrl: 'https://example.com/resumes/taylor.pdf',
        summary: 'Full-stack engineer with frontend leanings.',
        skills: ['React', 'TypeScript', 'Node.js', 'GraphQL'],
        experience: [
          {
            company: 'UIWorks',
            title: 'Full-stack Engineer',
            years: 5,
          },
        ],
        education: [
          {
            school: 'Colorado State University',
            degree: 'B.S. Information Systems',
            graduationYear: 2017,
          },
        ],
      },
    }),
  ]);

  console.log('Linking candidates to jobs with statuses...');
  await prisma.jobCandidate.createMany({
    data: [
      {
        jobId: backendJob.id,
        candidateId: candidates[0].id,
        status: 'screening',
        matchScore: 92,
        notes: 'Strong backend experience with Kafka.',
      },
      {
        jobId: backendJob.id,
        candidateId: candidates[2].id,
        status: 'applied',
        matchScore: 78,
        notes: 'Solid full-stack profile; dig deeper on scalability.',
      },
      {
        jobId: frontendJob.id,
        candidateId: candidates[1].id,
        status: 'interview',
        matchScore: 88,
        notes: 'Great design systems background.',
      },
    ],
  });

  console.log('Seeding candidates for Talent Forge...');
  const recruiterCandidate = await prisma.candidate.create({
    data: {
      userId: recruiter.id,
      fullName: 'Morgan Lee',
      email: 'morgan.lee@example.com',
      phone: '+1-555-0104',
      location: 'Austin, TX',
      resumeUrl: 'https://example.com/resumes/morgan.pdf',
      summary: 'Technical recruiter experienced with early-stage startups.',
      skills: ['Sourcing', 'Negotiation', 'ATS'],
      experience: [
        {
          company: 'ScaleHire',
          title: 'Recruiter',
          years: 4,
        },
      ],
      education: [
        {
          school: 'University of Texas',
          degree: 'B.A. Communications',
          graduationYear: 2015,
        },
      ],
    },
  });

  await prisma.jobCandidate.create({
    data: {
      jobId: recruiterJob.id,
      candidateId: recruiterCandidate.id,
      status: 'offer',
      matchScore: 90,
      notes: 'Excellent agency background and sourcing toolkit.',
    },
  });

  console.log('Seed data created successfully.');
  console.log('Log in with hiring.manager@example.com or recruiter@example.com using password "Password123!"');
}

main()
  .catch((error) => {
    console.error('Seed failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
