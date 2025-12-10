# Micro Bounty Board

A decentralized task management system built on the **IOTA Tangle**, enabling users to post, claim, and complete bounties with trustless payment settlement. This project demonstrates a full-stack integration of a **Move** smart contract with a modern **React** frontend.

## Table of Contents

- [Micro Bounty Board](#micro-bounty-board)
  - [Table of Contents](#table-of-contents)
  - [Introduction](#introduction)
  - [Key Features](#key-features)
  - [Techniques \& Architecture](#techniques--architecture)
  - [Technologies Used](#technologies-used)
  - [Project Structure](#project-structure)
  - [Installation \& Setup](#installation--setup)
    - [Prerequisites](#prerequisites)
    - [1. Smart Contract Deployment](#1-smart-contract-deployment)
    - [2. Frontend Setup](#2-frontend-setup)
  - [Configuration](#configuration)
  - [Smart Contract API](#smart-contract-api)
  - [Contribution](#contribution)
  - [License](#license)

## Introduction

The **Micro Bounty Board** leverages the IOTA network's unique object-centric data model to create a transparent marketplace for tasks. Unlike traditional bounty boards, this dApp ensures that funds are locked in the contract at the time of posting and are only released when the work is approved by the creator, eliminating counterparty risk.

## Key Features

- **Trustless Escrow**: Bounty rewards are locked in the `Task` object upon creation.
- **State-Driven Workflow**: Enforces a strict lifecycle: `Open` → `Claimed` → `Completed` → `Paid`.
- **Role-Based Access Control**:
  - **Creators** can cancel open tasks or approve completed work.
  - **Assignees** can mark claimed tasks as complete.
  - **Public** users can view and claim open tasks.
- **Reactive UI**: Real-time updates and optimistic UI states using React Query.
- **Wallet Integration**: Seamless connection with IOTA wallets via the dApp Kit.

## Techniques & Architecture

This project employs several advanced patterns suitable for scalable dApp development:

- **Resource-Oriented Programming (Move)**:
  The smart contract treats the `Task` as a [Move Resource](https://docs.iota.org/developer/move-overview/move-intro). This ensures that the bounty reward (an `IOTA` Coin) is physically stored within the task object and cannot be duplicated or accidentally destroyed.

- **Client-Side State Management**:
  We utilize [TanStack Query (React Query)](https://tanstack.com/query/latest) to manage server state. This abstracts the complexity of asynchronous blockchain data fetching, caching, and synchronization, providing a snappy user experience.

- **Component Composition**:
  The UI is built using [Radix UI](https://www.radix-ui.com/) primitives. This allows for accessible, unstyled components that are composed into a custom design system using `@radix-ui/themes`, avoiding the overhead of runtime CSS-in-JS libraries.

## Technologies Used

- **[IOTA Move](https://docs.iota.org/developer/move-overview/move-intro)**: Smart contract logic.
- **[React](https://react.dev/)**: Frontend library.
- **[Vite](https://vitejs.dev/)**: Next-generation frontend tooling.
- **[@iota/dapp-kit](https://sdk.iota.org/dapp-kit)**: React hooks and components for IOTA.
- **[@radix-ui/themes](https://www.radix-ui.com/themes/docs/overview/getting-started)**: High-quality, accessible UI components.
- **[TypeScript](https://www.typescriptlang.org/)**: Static typing for safer code.

## Project Structure

```string
/
├── frontend/
│   ├── src/
│   │   ├── App.tsx          # Main application logic & UI
│   │   ├── constants.ts     # Contract addresses & config
│   │   ├── networkConfig.ts # Network connection settings
│   │   └── main.tsx         # App entry & providers
│   ├── vite.config.ts       # Vite configuration
│   └── package.json         # Frontend dependencies
├── move/
│   ├── sources/
│   │   └── bounty_board.move # Move smart contract logic
│   └── Move.toml             # Package manifest
└── README.md
```

- **`frontend/`**: Contains the Single Page Application (SPA).
- **`move/`**: Contains the Move package, including the `lucky_bounty` module.

## Installation & Setup

### Prerequisites

- **Node.js** (v18+)
- **IOTA CLI** (for smart contract deployment)
- **IOTA Wallet** (browser extension)

### 1. Smart Contract Deployment

Navigate to the move directory and publish the package to the IOTA Testnet.

```bash
cd move
iota move build
iota move publish --gas-budget 100000000
```

> **Note**: Copy the **Package ID** from the output. You will need this for the frontend configuration.

### 2. Frontend Setup

Navigate to the frontend directory, install dependencies, and start the development server.

```bash
cd frontend
npm install
npm run dev
```

## Configuration

After deploying the contract, update the frontend configuration to point to your new package.

Edit `frontend/src/constants.ts`:

```typescript
export const PACKAGE_ID = "0x...<YOUR_PACKAGE_ID>";
export const MODULE_NAME = "lucky_bounty";
export const NETWORK = "testnet";
```

## Smart Contract API

The `lucky_bounty` module exposes the following entry functions:

| Function          | Description                                                               |
| :---------------- | :------------------------------------------------------------------------ |
| `post_task`       | Creates a new `Task` object and locks the reward coin.                    |
| `claim_task`      | Assigns an open task to the sender.                                       |
| `complete_task`   | Marks a claimed task as completed (Assignee only).                        |
| `approve_and_pay` | Transfers the reward to the assignee and deletes the task (Creator only). |
| `cancel_task`     | Returns the reward to the creator and deletes the task (Creator only).    |

## Contribution

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/{your-amazing-feature}`).
3. Commit your changes (`git commit -m 'Add some amazing feature'`).
4. Push to the branch (`git push origin feature/{your-amazing-feature}`).
5. Open a Pull Request.

## Contract address
https://explorer.iota.org/object/0xfa567025a8575ce22ee6481b36201c768735c9f0cad32d81ae6474a08da0879c?network=testnet

<img width="2054" height="1244" alt="image" src="https://github.com/user-attachments/assets/1f07efc4-1358-44f0-8a65-52b23a0ed19d" />


## License

Distributed under the MIT License.
