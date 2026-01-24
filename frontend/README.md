# DualMind Frontend

This is the frontend application for **DualMind**, an LLM-driven multi-agent simulation platform that models cognitive-affective cascades in public opinion dissemination. Built with React, TypeScript, and Vite, this interactive interface enables users to explore how cognitive beliefs and affective responses shape crisis communication dynamics.

## Prerequisites

- **Node.js** (version 16 or higher)
- **pnpm** (recommended package manager for faster, disk-efficient installations)

## Installation

1. Install pnpm globally (if not already installed):
```bash
npm install -g pnpm
```

2. Install project dependencies:
```bash
pnpm install
```

## Available Scripts

### `pnpm dev`

Starts the development server with hot module replacement (HMR).

- Open [http://localhost:3000](http://localhost:3000) to view the application
- The page automatically reloads when you make changes
- Lint errors and warnings appear in the console

### `pnpm build`

Creates an optimized production build in the `dist` folder.

- Bundles React in production mode for optimal performance
- Minifies code and adds content hashes to filenames
- Output is ready for deployment to any static hosting service

### `pnpm preview`

Serves the production build locally for testing before deployment.

- Open [http://localhost:4173](http://localhost:4173) to preview
- Useful for verifying production optimizations

### `pnpm lint`

Runs ESLint to analyze code quality and enforce coding standards.

- Automatically fixes issues where possible
- Reports remaining issues that require manual attention

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ChatInterface.tsx          # LLM strategy refinement chat
│   ├── NetworkVisualization.tsx   # Agent network graph
│   ├── ParameterPanel.tsx         # Simulation configuration
│   └── ...
├── pages/              # Page-level components
│   ├── HomePage.tsx              # Landing page
│   ├── Dashboard.tsx             # Scenario selection
│   ├── scenario1/                # User-defined simulation scenario
│   │   ├── Scenario1Page.tsx           # Main entry
│   │   ├── ConfigurationPanel.tsx      # Config & LLM chat
│   │   ├── VisualizationArea.tsx       # Network visualization
│   │   └── Scenario1ReportPage.tsx     # Analysis report
│   └── scenario2/                # Historical case comparison scenario
│       ├── Scenario2Page.tsx           # Main entry
│       ├── CaseSelectionPanel.tsx      # Case library
│       ├── Scenario2SimulationPage.tsx # Simulation control
│       ├── Scenario2ReportPage.tsx     # Comparative report
│       └── EvaluationMetricsReportPage.tsx  # Trajectory fidelity metrics
├── layout/             # Layout components (Header, MainLayout)
├── services/           # API client and data fetching
│   └── api.ts                    # FastAPI backend integration
├── types/              # TypeScript type definitions
├── hooks/              # Custom React hooks (useApi)
└── utils/              # Utility functions
```

## Key Features

### 🎭 Dual Simulation Scenarios

- **Scenario 1: Strategy Rehearsal Sandbox**
  - User-defined PR crisis simulation
  - Interactive LLM-powered strategy refinement chat
  - Real-time network visualization of opinion dynamics
  - 9-dimensional LLM-driven evaluation system

- **Scenario 2: Retrospective Case Analysis**
  - Library of 15 real-world PR crisis cases (post-Aug 2024)
  - Automatic comparison between simulation and historical outcomes
  - Dual report system: comparative analysis + trajectory fidelity metrics
  - Model validation with Pearson correlation, Jensen-Shannon divergence, and KL divergence

### 🎨 User Experience

- **Modern Dark Theme**: Professional UI design with dark mode aesthetics
- **Responsive Layout**: Optimized for desktop and tablet devices
- **Real-time Updates**: WebSocket-style polling for simulation progress
- **Interactive Visualizations**: Force-directed network graphs with D3.js
- **Dual Report Toggle**: Seamlessly switch between report types

### 🛠️ Technical Highlights

- **TypeScript**: Full type safety with comprehensive interface definitions
- **Ant Design**: Enterprise-grade UI component library
- **TanStack Query**: Powerful data fetching and caching
- **React Router**: Client-side routing with nested layouts
- **Recharts**: Responsive charting library for evaluation metrics
- **KaTeX**: Mathematical formula rendering for scientific metrics

## Technology Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 19.1.1 | UI framework |
| TypeScript | 5.0.2 | Type safety |
| Vite | 5.0.0 | Build tool & dev server |
| Ant Design | 5.27.4 | UI component library |
| React Router | 6.8.0 | Client-side routing |
| TanStack Query | 5.0.0 | Data fetching & caching |
| Recharts | 2.15.0 | Data visualization |
| D3.js | 7.9.0 | Network graph rendering |
| React KaTeX | 3.0.1 | Math formula rendering |

## API Integration

The frontend communicates with the FastAPI backend via RESTful APIs:

- **Base URL**: `http://localhost:8000`
- **Proxy Configuration**: Automatically handled by Vite dev server
- **API Documentation**: See `/docs/api-scenario1.md` and `/docs/api-scenario2.md`

## Development Workflow

1. **Start Backend Server**: Ensure the FastAPI backend is running on port 8000
2. **Start Frontend Dev Server**: Run `pnpm dev` to start on port 3000
3. **Hot Reload**: Make changes and see updates instantly
4. **Type Checking**: TypeScript validates types during development
5. **Linting**: ESLint enforces code quality standards

## Learn More

- [Vite Documentation](https://vitejs.dev/) - Fast build tool and dev server
- [React Documentation](https://react.dev/) - Modern React features and best practices
- [TypeScript Documentation](https://www.typescriptlang.org/) - Type system and language features
- [Ant Design Documentation](https://ant.design/) - Component API and design guidelines
- [pnpm Documentation](https://pnpm.io/) - Fast, disk-efficient package manager

## License

This project is part of the DualMind research initiative presented at The Web Conference (WWW) 2026.
