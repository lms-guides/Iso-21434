/* Course definition: modules, learning objectives and checkpoint quizzes. */
window.COURSE = {
  title: "FreeRTOS Field Guide",
  modules: [
    {
      id: "m01",
      num: 1,
      title: "Why an RTOS at all",
      short: "Mental model",
      minutes: 20,
      file: "content/m01.html",
      tags: ["superloop", "scheduler", "task states", "priorities"],
      objectives: [
        "Explain what a superloop cannot do that a preemptive kernel can",
        "Describe the five task states and the transitions between them",
        "State the FreeRTOS priority convention correctly, first time"
      ],
      quiz: [
        {
          q: "In a single-core FreeRTOS system, which task is executing at any instant?",
          options: [
            "The oldest task in the ready list",
            "The highest-priority task that is ready",
            "The task that has consumed the least CPU time",
            "Whichever task holds the mutex"
          ],
          answer: 1,
          why: "The scheduler always runs the highest-priority ready task. Equal priorities time-slice one tick each; a blocked or suspended task cannot run at all, no matter how important it is."
        },
        {
          q: "A task calls xQueueReceive(q, &item, pdMS_TO_TICKS(100)) and no data arrives. What happens after 100 ms?",
          options: [
            "It stays blocked forever",
            "It wakes, returns pdFALSE, and continues",
            "It is deleted by the kernel",
            "It calls the queue's overflow hook"
          ],
          answer: 1,
          why: "A timeout is the second way out of the Blocked state: the event or the timeout, whichever comes first. portMAX_DELAY is the special value that means 'no timeout'."
        }
      ]
    },
    {
      id: "m02",
      num: 2,
      title: "Get a build running",
      short: "Toolchain and first tasks",
      minutes: 30,
      file: "content/m02.html",
      tags: ["cubeMX", "esp-idf", "posix", "cmake", "bring-up"],
      objectives: [
        "Choose a board and toolchain route that matches your goal",
        "Add the kernel, one port and one heap file to a project",
        "Build and flash a two-task program with no HAL delays"
      ],
      quiz: [
        {
          q: "The linker reports 'undefined reference to vPortSVCHandler'. What is most likely missing?",
          options: [
            "A heap implementation such as heap_4.c",
            "The port directory for your CPU (port.c)",
            "configTOTAL_HEAP_SIZE",
            "The idle hook function"
          ],
          answer: 1,
          why: "The SVC/PendSV/SysTick handlers live in the architecture port. Adding the core sources without the matching portable/<compiler>/<arch> directory gives exactly this error."
        },
        {
          q: "vTaskStartScheduler() returns immediately on a Cortex-M board. What should you check first?",
          options: [
            "The priority of the idle task",
            "Whether the heap was large enough to create the idle and timer tasks",
            "The baud rate of the debug UART",
            "Whether configUSE_TIME_SLICING is enabled"
          ],
          answer: 1,
          why: "The scheduler only returns if it could not create the idle task (or the timer task when configUSE_TIMERS is 1). That is an allocation failure, so check configTOTAL_HEAP_SIZE and the malloc-failed hook."
        }
      ]
    },
    {
      id: "m03",
      num: 3,
      title: "FreeRTOSConfig.h: the contract",
      short: "Configuration",
      minutes: 25,
      file: "content/m03.html",
      tags: ["config", "heap", "tick", "NVIC", "assert"],
      objectives: [
        "Read and justify the twenty config values that matter",
        "Distinguish word-based stack sizes from byte-based heap sizes",
        "Set the interrupt priority ceiling from the MCU's implemented priority bits"
      ],
      quiz: [
        {
          q: "On a Cortex-M port, xTaskCreate(..., 256, ...) allocates how much stack?",
          options: [
            "256 bytes",
            "256 words (typically 1 KB)",
            "256 kilobytes",
            "It depends on configTOTAL_HEAP_SIZE"
          ],
          answer: 1,
          why: "Stack depth is expressed in StackType_t units, which are 32-bit words on Cortex-M. 256 words is 1024 bytes. Heap sizes are the ones expressed in bytes."
        },
        {
          q: "What is configMAX_SYSCALL_INTERRUPT_PRIORITY for?",
          options: [
            "The priority of the SysTick interrupt",
            "The highest NVIC priority (numerically lowest value) allowed to call FreeRTOS FromISR APIs",
            "The priority at which the scheduler runs",
            "The maximum number of nested interrupts"
          ],
          answer: 1,
          why: "Interrupts more urgent than this ceiling are never masked by critical sections, so they must not call the kernel. ISRs at or below the ceiling may use the FromISR APIs."
        }
      ]
    },
    {
      id: "m04",
      num: 4,
      title: "Tasks, priorities and stacks",
      short: "Tasks",
      minutes: 30,
      file: "content/m04.html",
      tags: ["xTaskCreate", "priority", "stack", "high water mark"],
      objectives: [
        "Create, suspend, resume and delete tasks correctly",
        "Assign priorities from deadlines rather than importance",
        "Size a task stack by measurement instead of guesswork"
      ],
      quiz: [
        {
          q: "Task A runs at priority 5 and task B at priority 2. Which statement is true?",
          options: [
            "B preempts A because lower numbers are more urgent",
            "A runs whenever it is ready, and B only runs when A blocks",
            "They time-slice evenly",
            "The scheduler refuses two different priorities"
          ],
          answer: 1,
          why: "In FreeRTOS a numerically higher priority is more urgent, and priority 0 is the idle task. A ready priority-5 task always beats a priority-2 task."
        },
        {
          q: "What must a task function do before it returns?",
          options: [
            "Call taskYIELD()",
            "Delete itself with vTaskDelete(NULL), or never return",
            "Release every mutex it took",
            "Call vTaskStartScheduler()"
          ],
          answer: 1,
          why: "Returning from a task function without deleting the task is undefined behaviour: there is no caller to return to. Either loop forever or call vTaskDelete(NULL)."
        }
      ]
    },
    {
      id: "m05",
      num: 5,
      title: "Time: ticks, drift and jitter",
      short: "Scheduling in time",
      minutes: 25,
      file: "content/m05.html",
      tags: ["vTaskDelay", "xTaskDelayUntil", "tick", "jitter", "drift"],
      objectives: [
        "Choose between relative and absolute delays with a reason",
        "Pick a tick rate from resolution, CPU cost and wrap period",
        "Measure jitter instead of assuming it"
      ],
      quiz: [
        {
          q: "A 10 ms periodic task does 3 ms of work per iteration. Which delay keeps the period at 10 ms?",
          options: [
            "vTaskDelay(pdMS_TO_TICKS(10))",
            "xTaskDelayUntil(&last, pdMS_TO_TICKS(10))",
            "vTaskDelay(pdMS_TO_TICKS(7))",
            "taskYIELD()"
          ],
          answer: 1,
          why: "vTaskDelay sleeps 10 ms after the work, giving 13 ms. xTaskDelayUntil sleeps until last + 10 ms, so the deadline is absolute and the error does not accumulate."
        },
        {
          q: "With configTICK_RATE_HZ = 1000, what is the shortest delay vTaskDelay can produce?",
          options: ["1 microsecond", "1 millisecond", "10 milliseconds", "100 microseconds"],
          answer: 1,
          why: "One tick is 1 ms at 1 kHz, and vTaskDelay(1) is the minimum. Sub-tick timing needs a hardware timer, not a faster tick."
        }
      ]
    },
    {
      id: "m06",
      num: 6,
      title: "Queues: moving data safely",
      short: "Queues",
      minutes: 35,
      file: "content/m06.html",
      tags: ["queue", "producer consumer", "ISR", "backpressure", "queue set"],
      objectives: [
        "Move fixed-size items between tasks and ISRs without shared globals",
        "Apply an explicit full-queue policy instead of hoping",
        "Size a queue from burst rate and worst-case consumer stall"
      ],
      quiz: [
        {
          q: "What does xQueueSend copy into the queue?",
          options: [
            "A pointer to your buffer",
            "uxItemSize bytes of the item, by value",
            "The whole task stack",
            "Nothing until the receiver calls xQueueReceive"
          ],
          answer: 1,
          why: "Queues copy fixed-size items. That makes small structs safe, and makes sending a pointer to a stack local a use-after-free bug."
        },
        {
          q: "A queue is full and the producer calls xQueueSend(q, &item, 0). What is returned?",
          options: [
            "pdPASS, and the oldest item is overwritten",
            "errQUEUE_FULL, immediately",
            "It blocks until space appears",
            "It asserts and resets the board"
          ],
          answer: 1,
          why: "A zero timeout means 'do not block', so the send fails at once with errQUEUE_FULL. Dropping the newest item is a valid policy, but you must count it."
        }
      ]
    },
    {
      id: "m07",
      num: 7,
      title: "Semaphores, mutexes and priority inversion",
      short: "Synchronization",
      minutes: 35,
      file: "content/m07.html",
      tags: ["semaphore", "mutex", "priority inversion", "critical section", "gatekeeper"],
      objectives: [
        "Pick between binary, counting, mutex and recursive mutex",
        "Reproduce priority inversion and explain how inheritance bounds it",
        "Keep critical sections short and mutex holds shorter"
      ],
      quiz: [
        {
          q: "Which object provides priority inheritance?",
          options: [
            "Binary semaphore",
            "Counting semaphore",
            "Mutex",
            "Event group"
          ],
          answer: 2,
          why: "Only mutexes implement priority inheritance: a low-priority holder temporarily inherits the priority of the highest waiter. Use a mutex for mutual exclusion, semaphores for signalling."
        },
        {
          q: "Which call is legal inside an ISR?",
          options: [
            "xSemaphoreTake(mutex, portMAX_DELAY)",
            "xSemaphoreGiveFromISR(binary, &woken)",
            "vTaskDelay(1)",
            "xTimerStart(timer, 0)"
          ],
          answer: 1,
          why: "ISRs may not block. Mutexes and delays are forbidden, and timer APIs need their FromISR variants. Giving a binary semaphore with FromISR is the canonical ISR-to-task hand-off."
        }
      ]
    },
    {
      id: "m08",
      num: 8,
      title: "Notifications, event groups and buffers",
      short: "Lightweight primitives",
      minutes: 30,
      file: "content/m08.html",
      tags: ["task notification", "event group", "stream buffer", "message buffer"],
      objectives: [
        "Replace a semaphore with a task notification where it fits",
        "Wait on a combination of conditions with an event group",
        "Stream bytes and variable-length frames without a queue per byte"
      ],
      quiz: [
        {
          q: "How many tasks can block on the same notification index of one task?",
          options: ["One", "Two", "Up to configMAX_PRIORITIES", "Unlimited"],
          answer: 0,
          why: "A notification slot has one pending flag and one 32-bit value, so exactly one waiter. With several consumers you need a queue or an event group."
        },
        {
          q: "Which call waits until both EVT_A and EVT_B are set?",
          options: [
            "xEventGroupWaitBits(g, EVT_A | EVT_B, pdFALSE, pdTRUE, timeout)",
            "xEventGroupWaitBits(g, EVT_A & EVT_B, pdTRUE, pdFALSE, timeout)",
            "xEventGroupSetBits(g, EVT_A | EVT_B)",
            "xEventGroupClearBits(g, EVT_A | EVT_B)"
          ],
          answer: 0,
          why: "The third parameter clears on exit, the fourth selects wait-for-all. Passing pdTRUE for 'all' is what makes both bits required."
        }
      ]
    },
    {
      id: "m09",
      num: 9,
      title: "Software timers and interrupt discipline",
      short: "Timers and ISRs",
      minutes: 30,
      file: "content/m09.html",
      tags: ["software timer", "daemon task", "ISR", "deferred processing", "NVIC"],
      objectives: [
        "Use one-shot and auto-reload timers without blocking the daemon",
        "Apply the seven ISR rules, including the priority ceiling",
        "Choose a deferred-processing pattern for each interrupt source"
      ],
      quiz: [
        {
          q: "Where does a software timer callback execute?",
          options: [
            "In the interrupt that started the timer",
            "In the timer daemon task",
            "In the calling task's context",
            "In the idle task"
          ],
          answer: 1,
          why: "Callbacks run in the timer service (daemon) task, whose priority and stack you set in the config. A slow callback delays every other timer, which is why callbacks must not block."
        },
        {
          q: "Why must an ISR never call xQueueSend?",
          options: [
            "It is slower than xQueueSendFromISR",
            "It can block, and blocking is illegal in an interrupt",
            "It disables interrupts for too long",
            "Queues cannot be used from interrupts at all"
          ],
          answer: 1,
          why: "xQueueSend may block and manipulates scheduler state that is invalid in interrupt context. The FromISR variant never blocks and reports whether a higher-priority task should be switched to."
        }
      ]
    },
    {
      id: "m10",
      num: 10,
      title: "Memory: heaps, stacks and static allocation",
      short: "Memory",
      minutes: 25,
      file: "content/m10.html",
      tags: ["heap_4", "heap_5", "static allocation", "stack overflow", "fragmentation"],
      objectives: [
        "Choose a heap scheme from determinism and fragmentation needs",
        "Move a project to fully static allocation",
        "Produce a memory budget with measured numbers"
      ],
      quiz: [
        {
          q: "Which heap scheme never frees memory?",
          options: ["heap_1", "heap_2", "heap_3", "heap_4"],
          answer: 0,
          why: "heap_1 only allocates. It is the smallest and fully deterministic, and is a good fit when everything is created at boot. heap_2 frees but does not coalesce and is deprecated."
        },
        {
          q: "With configSUPPORT_STATIC_ALLOCATION = 1, what must your application provide?",
          options: [
            "Nothing, the kernel allocates the idle task itself",
            "vApplicationGetIdleTaskMemory (and the timer task memory if timers are used)",
            "A custom malloc implementation",
            "A linker script change only"
          ],
          answer: 1,
          why: "Static allocation means the kernel cannot call malloc for its own tasks, so it asks the application for the idle task's stack and TCB, plus the timer task's when configUSE_TIMERS is 1."
        }
      ]
    },
    {
      id: "m11",
      num: 11,
      title: "Architecture: from requirements to a task set",
      short: "Design",
      minutes: 40,
      file: "content/m11.html",
      tags: ["design", "rate monotonic", "decomposition", "data ownership", "patterns"],
      objectives: [
        "Turn a timing requirements table into a defensible task list",
        "Assign priorities and check CPU utilization before coding",
        "Apply single-writer ownership so most locks disappear"
      ],
      quiz: [
        {
          q: "Under rate-monotonic scheduling, which task gets the highest priority?",
          options: [
            "The one with the longest period",
            "The one with the shortest period",
            "The one with the largest stack",
            "The one that was created first"
          ],
          answer: 1,
          why: "Shorter period means a tighter deadline, so it gets the higher priority. Check schedulability with the utilization bound, and keep total CPU load near or below 70%."
        },
        {
          q: "Which rule removes the most synchronization bugs?",
          options: [
            "Protect every global with a mutex",
            "Give each piece of data exactly one writer and pass messages to other tasks",
            "Make every shared variable volatile",
            "Raise the priority of the writer"
          ],
          answer: 1,
          why: "Single-writer ownership makes races impossible by construction: only one context mutates the data, everyone else asks for it through a queue or notification. Locks become rare rather than default."
        }
      ]
    },
    {
      id: "m12",
      num: 12,
      title: "Debugging and instrumentation",
      short: "Debug",
      minutes: 35,
      file: "content/m12.html",
      tags: ["assert", "runtime stats", "tracealyzer", "systemview", "hard fault", "gdb"],
      objectives: [
        "Use kernel instrumentation to answer 'what is running and how much stack is left'",
        "Decode a HardFault to the offending instruction",
        "Recognize the ten classic FreeRTOS failure signatures"
      ],
      quiz: [
        {
          q: "uxTaskGetStackHighWaterMark returns a value in what unit?",
          options: ["Bytes", "Words (StackType_t)", "Percent", "Ticks"],
          answer: 1,
          why: "The high-water mark is the minimum free stack measured in StackType_t units, so multiply by sizeof(StackType_t) for bytes. Aim for at least 30% headroom on the worst-case path."
        },
        {
          q: "A HardFault handler fires intermittently under load. What is the most useful first step?",
          options: [
            "Raise configMAX_PRIORITIES",
            "Extract the stacked PC/LR and CFSR from the exception frame",
            "Disable interrupts and ship it",
            "Increase every task stack by 1 KB"
          ],
          answer: 1,
          why: "The fault status registers and the stacked program counter tell you the fault class (bus, memory, usage) and the exact instruction. Guessing at stacks hides the cause."
        }
      ]
    },
    {
      id: "m13",
      num: 13,
      title: "Capstone: build a sensor data logger",
      short: "Capstone project",
      minutes: 60,
      file: "content/m13.html",
      tags: ["project", "logger", "CLI", "watchdog", "task table", "milestones"],
      objectives: [
        "Turn a one-page specification into a task table and module layout",
        "Implement sampling, processing, storage, CLI and health tasks",
        "Bring the system up in seven verifiable milestones"
      ],
      quiz: [
        {
          q: "The sensor task stops producing samples. Which design detects that fastest?",
          options: [
            "The storage task retries its write",
            "The health task compares per-task heartbeat counters against deadlines",
            "The CLI prints an error when the user types 'status'",
            "The watchdog resets the board after 5 seconds"
          ],
          answer: 1,
          why: "Heartbeat counters turn a silent stall into a named, timestamped fault, and the health task can log it before the watchdog fires. The watchdog is the last resort, not the diagnostic."
        },
        {
          q: "Which bring-up order gives you a testable system at every step?",
          options: [
            "All tasks at once, then debug",
            "Blink and UART first, then queues, then storage, then CLI, then health",
            "CLI first, because it helps debugging",
            "Storage first, because it is the riskiest"
          ],
          answer: 1,
          why: "Each milestone adds one observable behaviour to a working system. A CLI before there is anything to report, or all tasks at once, turns a small bug into an integration puzzle."
        }
      ]
    },
    {
      id: "m14",
      num: 14,
      title: "Shipping: hardening and release checklist",
      short: "Production",
      minutes: 30,
      file: "content/m14.html",
      tags: ["watchdog", "error handling", "tickless", "firmware update", "testing", "release"],
      objectives: [
        "Design a watchdog and fault-logging strategy that survives real failures",
        "Budget CPU, RAM and power with margin you can defend",
        "Run a release checklist instead of hoping"
      ],
      quiz: [
        {
          q: "Where should the independent watchdog be refreshed?",
          options: [
            "In the highest-priority ISR",
            "In one health task, only after every supervised task has reported in",
            "In every task, so a stall never resets the board",
            "In the idle hook"
          ],
          answer: 1,
          why: "Refreshing from many places defeats the watchdog. One supervisor that checks all heartbeats means a single stalled task still leads to a reset — which is the point."
        },
        {
          q: "Why does an A/B firmware update scheme pair well with a watchdog?",
          options: [
            "It makes the image smaller",
            "A failed boot can be rolled back to the last known-good slot",
            "It removes the need for a bootloader",
            "It allows unsigned images"
          ],
          answer: 1,
          why: "If the new image fails to reach its 'confirmed' state, the bootloader falls back to the previous slot. Signing and version checks still apply; A/B only provides the rollback path."
        }
      ]
    },
    {
      id: "m15",
      num: 15,
      title: "Your first project, step by step",
      short: "Hands-on tutorial",
      minutes: 120,
      file: "content/m15.html",
      tags: ["tutorial", "nucleo", "cubemx", "button", "debounce", "console", "first project"],
      objectives: [
        "Create a FreeRTOS project from an empty CubeMX project and prove the scheduler runs",
        "Turn a button press into a debounced event delivered by queue",
        "Build a UART console and a diagnostics command you will reuse in every project"
      ],
      quiz: [
        {
          q: "In the tutorial, where does the 50 ms debounce callback execute?",
          options: [
            "In the EXTI interrupt handler",
            "In the timer daemon task",
            "In the heartbeat task",
            "In the idle task"
          ],
          answer: 1,
          why: "Software timer callbacks run in the timer service task, so they may read a pin and send to a queue. That is exactly why the ISR only restarts the timer instead of debouncing itself."
        },
        {
          q: "USART2 and EXTI are set to NVIC priority 6 while configLIBRARY_MAX_SYSCALL_INTERRUPT_PRIORITY is 5. Why is that correct?",
          options: [
            "Priority 6 is more urgent than 5, so the ISR runs faster",
            "Priority 6 is numerically greater, so it is less urgent than the ceiling and may call FromISR APIs",
            "Priority 6 disables interrupts during the ISR",
            "CubeMX requires all ISRs to use priority 6"
          ],
          answer: 1,
          why: "On Cortex-M a larger number means lower urgency. Interrupts at or below the ceiling may call FreeRTOS APIs; anything above it is never masked by critical sections and must not touch the kernel."
        }
      ]
    }
  ]
};
