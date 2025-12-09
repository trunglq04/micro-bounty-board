import { ConnectButton, useCurrentAccount, useSignAndExecuteTransaction, useIotaClient } from "@iota/dapp-kit";
import { Transaction } from "@iota/iota-sdk/transactions";
import { useState } from "react";
import { Container, Flex, Heading, Box, Card, Text, Button, TextField, Badge, Grid } from "@radix-ui/themes";
import { PACKAGE_ID, MODULE_NAME } from "./constants";

// --- Types based on Move Contract ---
type TaskStatus = 0 | 1 | 2; // 0: Open, 1: Claimed, 2: Completed

interface TaskFields {
  id: { id: string };
  creator: string;
  assignee: string | null; // Option<address> comes as null or string in JSON
  description: string;
  status: TaskStatus;
  reward: string; // Balance is a number, but usually returned as string in JSON
}

function App() {
  const account = useCurrentAccount();
  return (
    <Container size="3" p="4">
      <Flex justify="between" align="center" mb="6">
        <Heading size="6" color="blue">Micro Bounty Board</Heading>
        <ConnectButton />
      </Flex>

      <Flex direction="column" gap="6">
        {account ? (
          <>
            <CreateTaskSection />
            <TaskViewerSection />
          </>
        ) : (
          <Card size="3">
            <Flex justify="center" py="8">
              <Heading size="4">Please connect your wallet to view the board.</Heading>
            </Flex>
          </Card>
        )}
      </Flex>
    </Container>
  );
}

// --- Component: Create New Task ---
function CreateTaskSection() {
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");

  const handlePost = () => {
    if (!desc || !amount) return;

    const tx = new Transaction();
    const mistAmount = BigInt(parseFloat(amount) * 1_000_000_000); // Convert IOTA to MIST

    // 1. Split coin from gas for the reward
    const [coin] = tx.splitCoins(tx.gas, [mistAmount]);

    // 2. Call post_task
    tx.moveCall({
      target: `${PACKAGE_ID}::${MODULE_NAME}::post_task`,
      arguments: [
        tx.pure.string(desc),
        coin,
      ],
    });

    signAndExecute(
      { transaction: tx },
      {
        onSuccess: (result) => {
          alert(`Task Posted! Digest: ${result.digest}`);
          setDesc("");
          setAmount("");
        },
        onError: (err) => {
          console.error(err);
          alert("Failed to post task.");
        }
      }
    );
  };

  return (
    <Card size="3">
      <Heading size="5" mb="4">Post a Bounty</Heading>
      <Grid columns={{ initial: "1", md: "3" }} gap="4">
        <Box style={{ gridColumn: "span 2" }}>
          <TextField.Root
            placeholder="Task Description (e.g. Fix CSS bug)"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
        </Box>
        <TextField.Root
          placeholder="Reward (IOTA)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </Grid>
      <Box mt="4">
        <Button onClick={handlePost}>
          Post Task
        </Button>
      </Box>
    </Card>
  );
}

// --- Component: View & Interact with a Task ---
function TaskViewerSection() {
  const client = useIotaClient();
  const [searchId, setSearchId] = useState("");
  const [taskData, setTaskData] = useState<TaskFields | null>(null);
  const [isDeleted, setIsDeleted] = useState(false);

  const fetchTask = async () => {
    if (!searchId) return;
    try {
      const obj = await client.getObject({
        id: searchId,
        options: { showContent: true },
      });

      if (obj.data?.content?.dataType === "moveObject") {
        // Cast the fields to our interface
        const fields = obj.data.content.fields as unknown as TaskFields;
        setTaskData(fields);
        setIsDeleted(false);
      } else {
        // If we have taskData and we are refreshing (same ID), assume deleted.
        if (taskData && taskData.id.id === searchId) {
          setIsDeleted(true);
        } else {
          alert("Object not found or not a Move object.");
          setTaskData(null);
          setIsDeleted(false);
        }
      }
    } catch (e) {
      console.error(e);
      if (taskData && taskData.id.id === searchId) {
        setIsDeleted(true);
      } else {
        alert("Error fetching object.");
        setTaskData(null);
        setIsDeleted(false);
      }
    }
  };

  return (
    <Flex direction="column" gap="4">
      <Card size="3">
        <Heading size="4" mb="2">Find Task</Heading>
        <Flex gap="2">
          <Box flexGrow="1">
            <TextField.Root
              placeholder="Paste Task Object ID"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
            />
          </Box>
          <Button onClick={fetchTask} variant="soft">
            Load
          </Button>
        </Flex>
      </Card>

      {taskData && <TaskCard task={taskData} refresh={fetchTask} isDeleted={isDeleted} />}
    </Flex>
  );
}

// --- Component: Individual Task Card Logic ---
function TaskCard({ task, refresh, isDeleted }: { task: TaskFields, refresh: () => void, isDeleted: boolean }) {
  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  const isCreator = account?.address === task.creator;
  // Handle Option<address> format, get struct or null
  const assigneeAddr = task.assignee ? (typeof task.assignee === 'object' && 'fields' in task.assignee ? (task.assignee as any).fields : task.assignee) : null;
  const isAssignee = account?.address === assigneeAddr;

  const STATUS_LABELS = ["OPEN", "CLAIMED", "COMPLETED"];
  const STATUS_COLORS: ("green" | "yellow" | "blue")[] = ["green", "yellow", "blue"];

  const executeMoveCall = (funcName: string) => {
    const tx = new Transaction();
    tx.moveCall({
      target: `${PACKAGE_ID}::${MODULE_NAME}::${funcName}`,
      arguments: [tx.object(task.id.id)],
    });

    signAndExecute({ transaction: tx }, { onSuccess: () => { setTimeout(refresh, 2000); } });
  };

  return (
    <Card size="3" style={{
      borderLeft: isDeleted ? "4px solid var(--gray-8)" : "4px solid var(--accent-9)",
      backgroundColor: isDeleted ? "var(--gray-3)" : undefined
    }}>
      <Flex justify="between" align="start">
        <Box>
          <Badge color={isDeleted ? "gray" : STATUS_COLORS[task.status]}>
            {isDeleted ? "DELETED" : STATUS_LABELS[task.status]}
          </Badge>
          <Heading size="5" mt="2" style={{ textDecoration: isDeleted ? "line-through" : undefined }}>
            {task.description}
          </Heading>
          <Text as="p" size="2" color="gray" mt="1">Reward: {Number(task.reward) / 1_000_000_000} IOTA</Text>
        </Box>
        <Box style={{ textAlign: "right" }}>
          <Text as="p" size="1" color="gray" style={{ fontFamily: 'monospace' }}>
            Creator: {task.creator.slice(0, 6)}...{task.creator.slice(-4)}
          </Text>
          <Text as="p" size="1" color="gray" style={{ fontFamily: 'monospace' }}>
            Assignee: {assigneeAddr ? `${assigneeAddr.slice(0, 6)}...${assigneeAddr.slice(-4)} ` : "None"}
          </Text>
        </Box>
      </Flex>

      {!isDeleted && (
        <Flex mt="4" gap="3" pt="4" style={{ borderTop: "1px solid var(--gray-5)" }}>
          {/* Logic: Who can see what button */}

          {/* 1. Anyone can claim if Open */}
          {task.status === 0 && (
            <Button
              onClick={() => executeMoveCall("claim_task")}
              color="green"
            >
              Claim Task
            </Button>
          )}

          {/* 2. Assignee can Complete if Claimed */}
          {task.status === 1 && isAssignee && (
            <Button
              onClick={() => executeMoveCall("complete_task")}
              color="indigo"
            >
              Mark Completed
            </Button>
          )}

          {/* 3. Creator can Approve/Pay if Completed */}
          {task.status === 2 && isCreator && (
            <Button
              onClick={() => executeMoveCall("approve_and_pay")}
              color="blue"
            >
              Approve & Pay
            </Button>
          )}

          {/* 4. Creator can Cancel if Open */}
          {task.status === 0 && isCreator && (
            <Button
              onClick={() => executeMoveCall("cancel_task")}
              color="red"
            >
              Cancel Task
            </Button>
          )}

          {/* Fallback text if waiting */}
          {task.status === 1 && !isAssignee && <Text color="gray" style={{ fontStyle: "italic" }}>Work in progress by assignee...</Text>}
          {task.status === 2 && !isCreator && <Text color="gray" style={{ fontStyle: "italic" }}>Waiting for creator approval...</Text>}
        </Flex>
      )}
    </Card>
  );
} export default App;