# Scientific Revolution (Sail v1) - Platform Specification

## 1. Overview
**Scientific Revolution** is a coordination platform designed to facilitate collaboration within distributed, volunteer-driven movements whose participants are largely driven by intrinsic motivation rather than extrinsic motivation such as pay or praise. The system is built around users (including individuals, organizations, and AI agents) who have some capacity, often latent. Users also contribute tasks and projects, though these are often latent as well and require work to elicit the right ones. The platform is designed with a simple but colorful aesthetic, emphasizing functionality, clarity, and the belief that work should be purposeful and engaging.

## 2. Core Purpose
To match highly skilled individuals with roles, projects, tasks, and events by analyzing their capabilities, maintaining a relationship graph, organizing and syncing context, and trying to understand and support their intrinsic motivation(s).

## 2.1 Core Use-cases
1. Matching people with meaningful volunteer work within organizations like UNICEF or Public AI
2. Helping people find interesting learning opportunities
3. Organizing long-term research and writing projects across distributed entities and organizations
4. Helping people form long-term relationships with new communities, teams, and projects organized a shared passion

## 2.2 What We Are Not
1. We do not support extrinsic rewards such as pay, badges, recognition, or social praise in the platform itself. We offset all such aspects to an external API or to partners.
2. We do not construct interfaces or surfaces for specific tasks (e.g. word editing, developer IDEs, readers, etc.), even though this is an important part of enabling engrossing, intrinsically motivated work (i.e. "flow"). To the degree possible, we build integrations to interfaces or APIs from partners.

## 3. Key Features

### 3.1. Streamlined Onboarding
The entry point into the network offers three distinct paths for a user to initialize their "node":
*   **Chat (AI Agent):** An interactive conversational agent that extracts a user's expertise and affiliations to build a preliminary profile and relationship graph.
*   **Upload:** Allows users to drag-and-drop capability documents (PDF, MD, TXT), link their public profiles (e.g., LinkedIn) for scraping, or manually enter a self-description.
*   **Use Code:** A secure entry point for users affiliated with recognized partner organizations to input an authorization code (e.g., `SR-XXXX-YYYY`).

### 3.2. Contributor Dashboard
The central hub for active network participants.
*   **Task Feed:** A highly focused, social-first feed of available tasks and projects. Task cards use generous whitespace (min 60vh height) to ensure the user focuses on one task at a time.
*   **Synchronous Event Calendar:** A slide-out panel (Sheet) in the header that curates and displays upcoming synchronous network events.
*   **Motivation Score System:** Instead of earning traditional units or currency, actions yield positive or negative motivation (`+ MOTIVATION` / `- MOTIVATION`). This conceptually represents the predicted likelihood of the user completing future tasks.

### 3.3. Task Dossier & Workspace
A detailed view for executing specific network tasks.
*   **Context & Evaluation:** Displays the rationale behind the task and the "Evaluation Loop" criteria.
*   **Workspace Tabs:** Provides an integrated environment for task execution. Notably includes a "Connect MCP" tab featuring a UI for connecting to the Claude Desktop application, allowing seamless AI-assisted workflows.

### 3.4. Profile & Identity Management
Users manage their network identity and connections.
*   **Profile Editor:** Markdown-based editing for personal profiles (`profile.md`).
*   **Relationship Graph (`relationships.md`):** A dedicated section for mapping connections to other users or DAOs using wiki-style linking (e.g., `[[Public AI]]`).
*   **Graph Visualization:** A toggleable, SVG-based network visualization that maps out the user's connections within the broader Scientific Revolution ecosystem.

## 4. User Flow

1.  **Arrival & Initialization (Home Page):**
    *   User arrives at the stark landing page ("HOW CAN YOU HELP?").
    *   User chooses an onboarding method (Chat, Upload, Use Code).
    *   Upon completion, the system parses the input and presents a "Profile Created" success dialog.
    *   User proceeds to the Dashboard.

2.  **Discovery & Engagement (Dashboard):**
    *   User views their global network status (Connection, Latency, Motivation).
    *   User scrolls through the vertically-spaced task feed.
    *   User can open the Calendar to view or join synchronous events.
    *   User selects a task to view its detailed Dossier.

3.  **Task Execution (Dossier):**
    *   User reviews the task rationale and evaluation criteria.
    *   User accesses the Workspace, potentially connecting their MCP (Claude Desktop) for assistance.
    *   Upon task completion or interaction, the user's Motivation Score is updated.

4.  **Network Identity (Profile):**
    *   User periodically updates their `profile.md`.
    *   User defines new affiliations in `relationships.md`.
    *   User views their expanded social graph to see their position within the network.

## 5. Design System & Aesthetics
*   **Visual Style:** Brutalist, stark, monochrome (black and white).
*   **Typography:** Monospace fonts exclusively (IBM Plex Mono/Courier equivalents). Heavy use of uppercase text with wide tracking for headings and buttons.
*   **Layout:** Border-heavy elements, sharp corners (no border-radius), and high-contrast active/hover states. Generous use of whitespace in content feeds to force focus.