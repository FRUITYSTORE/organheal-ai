import Link from "next/link";

type WeeklyTasksPanelProps = {
  kicker: string;
  title: string;
  description: string;
  tasks: string[];
  completedTasks: string[];
  progressPercent: number;
  doneLabel: string;
  todoLabel: string;
  resetLabel: string;
  checkInLabel: string;
  onToggleTask: (task: string) => void;
  onResetTasks: () => void;
};

export default function WeeklyTasksPanel({
  kicker,
  title,
  description,
  tasks,
  completedTasks,
  progressPercent,
  doneLabel,
  todoLabel,
  resetLabel,
  checkInLabel,
  onToggleTask,
  onResetTasks,
}: WeeklyTasksPanelProps) {
  return (
    <section className="hpPanel" id="tasks">
      <div className="hpPanelHeader">
        <div className="hpPanelKicker">{kicker}</div>
        <h2 className="hpPanelTitle">{title}</h2>
        <p className="hpPanelText">{description}</p>
      </div>

      <div className="hpProgressWrap" style={{ background: "rgba(15,23,42,0.12)" }}>
        <div className="hpProgressFill" style={{ width: `${progressPercent}%` }} />
      </div>

      <div className="hpTasks" style={{ marginTop: 18 }}>
        {tasks.map((task, index) => {
          const done = completedTasks.includes(task);

          return (
            <label className={`hpTask ${done ? "done" : ""}`} key={task}>
              <span className="hpTaskNumber">{index + 1}</span>
              <input
                type="checkbox"
                checked={done}
                onChange={() => onToggleTask(task)}
              />
              <span className="hpTaskText">{task}</span>
              <span className={`hpBadge ${done ? "good" : "warn"}`}>
                {done ? doneLabel : todoLabel}
              </span>
            </label>
          );
        })}
      </div>

      <div className="hpActions">
        <button type="button" className="hpSecondary" onClick={onResetTasks}>
          {resetLabel}
        </button>

        <Link href="/checkin" className="hpPrimary">
          {checkInLabel}
        </Link>
      </div>
    </section>
  );
}