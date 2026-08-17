"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import Link from "next/link";

import {
  supabase,
} from "@/lib/supabase";

type NotificationPriority =
  | "low"
  | "medium"
  | "high"
  | "critical";

type NotificationStatus =
  | "unread"
  | "read"
  | "dismissed"
  | "expired";

type NotificationAction = {
  label:
    string;

  href:
    string;
};

type NotificationSafety = {
  note:
    string;

  requiresProfessionalReview:
    boolean;

  requiresUrgentReview:
    boolean;
};

type NotificationItem = {
  id:
    string;

  purpose:
    string;

  priority:
    NotificationPriority;

  status:
    NotificationStatus;

  title:
    string;

  body:
    string;

  action:
    NotificationAction | null;

  safety:
    NotificationSafety | null;

  createdAt:
    string;

  readAt:
    string | null;

  expiresAt:
    string | null;
};

type NotificationResponse = {
  success:
    true;

  unreadCount:
    number;

  hasUnread:
    boolean;

  notifications:
    NotificationItem[];
};

type NotificationLifecycleAction =
  | "read"
  | "dismiss";

type NotificationBellProps = {
  isArabic:
    boolean;
};

function formatNotificationDate(
  value:
    string,
  isArabic:
    boolean
): string {
  const parsed =
    new Date(
      value
    );

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return value;
  }

  return parsed.toLocaleDateString(
    isArabic
      ? "ar"
      : "en",
    {
      month:
        "short",

      day:
        "numeric",

      year:
        "numeric",
    }
  );
}

function getPriorityLabel(
  priority:
    NotificationPriority,
  isArabic:
    boolean
): string {
  const labels = {
    low:
      isArabic
        ? "روتيني"
        : "Routine",

    medium:
      isArabic
        ? "متابعة"
        : "Follow-up",

    high:
      isArabic
        ? "مهم"
        : "Important",

    critical:
      isArabic
        ? "عاجل"
        : "Urgent",
  };

  return labels[
    priority
  ];
}

export default function NotificationBell({
  isArabic,
}: NotificationBellProps) {
  const [
    isOpen,
    setIsOpen,
  ] =
    useState(
      false
    );

  const [
    notifications,
    setNotifications,
  ] =
    useState<
      NotificationItem[]
    >(
      []
    );

  const [
    unreadCount,
    setUnreadCount,
  ] =
    useState(
      0
    );

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(
      false
    );

  const [
    error,
    setError,
  ] =
    useState(
      ""
    );

  const [
    updatingId,
    setUpdatingId,
  ] =
    useState<
      string | null
    >(
      null
    );

  const containerRef =
    useRef<
      HTMLDivElement | null
    >(
      null
    );

  const labels = {
    notifications:
      isArabic
        ? "الإشعارات"
        : "Notifications",

    close:
      isArabic
        ? "إغلاق الإشعارات"
        : "Close notifications",

    emptyTitle:
      isArabic
        ? "لا توجد إشعارات جديدة"
        : "You’re all caught up",

    emptyBody:
      isArabic
        ? "ستظهر هنا تحديثات التقارير والمتابعة والخطوات الصحية المهمة."
        : "Report updates, follow-up reminders, and important health actions will appear here.",

    loading:
      isArabic
        ? "جارٍ تحميل الإشعارات..."
        : "Loading notifications...",

    loadError:
      isArabic
        ? "تعذر تحميل الإشعارات."
        : "Could not load notifications.",

    markRead:
      isArabic
        ? "تحديد كمقروء"
        : "Mark as read",

    dismiss:
      isArabic
        ? "إخفاء"
        : "Dismiss",

    openAction:
      isArabic
        ? "فتح الخطوة"
        : "Open action",
  };

  const getAccessToken =
    useCallback(
      async (): Promise<
        string
      > => {
        const {
          data,
          error:
            sessionError,
        } =
          await supabase
            .auth
            .getSession();

        const accessToken =
          data
            .session
            ?.access_token;

        if (
          sessionError ||
          !accessToken
        ) {
          throw new Error(
            "Authenticated session is required."
          );
        }

        return accessToken;
      },
      []
    );

  const loadNotifications =
    useCallback(
      async () => {
        setIsLoading(
          true
        );

        setError(
          ""
        );

        try {
          const accessToken =
            await getAccessToken();

          const response =
            await fetch(
              "/api/notifications?limit=20",
              {
                method:
                  "GET",

                headers: {
                  Authorization:
                    `Bearer ${accessToken}`,
                },
              }
            );

          const payload =
            (await response
              .json()
              .catch(
                () =>
                  null
              )) as
              | NotificationResponse
              | {
                  error?:
                    string;
                }
              | null;

          if (
            !response.ok ||
            !payload ||
            !(
              "success" in
              payload
            )
          ) {
            throw new Error(
              payload &&
                "error" in
                  payload &&
                payload.error
                ? payload.error
                : labels.loadError
            );
          }

          setNotifications(
            payload
              .notifications
          );

          setUnreadCount(
            payload
              .unreadCount
          );
        } catch (
          loadError
        ) {
          console.error(
            "Could not load notifications:",
            loadError
          );

          setError(
            labels.loadError
          );
        } finally {
          setIsLoading(
            false
          );
        }
      },
      [
        getAccessToken,
        labels.loadError,
      ]
    );

  const updateNotification =
    useCallback(
      async (
        notification:
          NotificationItem,
        action:
          NotificationLifecycleAction
      ) => {
        setUpdatingId(
          notification.id
        );

        setError(
          ""
        );

        try {
          const accessToken =
            await getAccessToken();

          const response =
            await fetch(
              `/api/notifications/${encodeURIComponent(
                notification.id
              )}`,
              {
                method:
                  "PATCH",

                headers: {
                  Authorization:
                    `Bearer ${accessToken}`,

                  "Content-Type":
                    "application/json",
                },

                body:
                  JSON.stringify({
                    action,
                  }),
              }
            );

          const payload =
            (await response
              .json()
              .catch(
                () =>
                  null
              )) as
              | {
                  success?:
                    boolean;

                  error?:
                    string;
                }
              | null;

          if (
            !response.ok ||
            !payload
              ?.success
          ) {
            throw new Error(
              payload
                ?.error ||
                labels.loadError
            );
          }

          const wasUnread =
            notification
              .status ===
            "unread";

          if (
            action ===
              "dismiss"
          ) {
            setNotifications(
              (
                current
              ) =>
                current.filter(
                  (
                    item
                  ) =>
                    item.id !==
                    notification.id
                )
            );
          } else {
            setNotifications(
              (
                current
              ) =>
                current.map(
                  (
                    item
                  ) =>
                    item.id ===
                    notification.id
                      ? {
                          ...item,

                          status:
                            "read",

                          readAt:
                            new Date()
                              .toISOString(),
                        }
                      : item
                )
            );
          }

          if (
            wasUnread
          ) {
            setUnreadCount(
              (
                current
              ) =>
                Math.max(
                  0,
                  current -
                    1
                )
            );
          }
        } catch (
          updateError
        ) {
          console.error(
            "Could not update notification:",
            updateError
          );

          setError(
            isArabic
              ? "تعذر تحديث الإشعار."
              : "Could not update the notification."
          );
        } finally {
          setUpdatingId(
            null
          );
        }
      },
      [
        getAccessToken,
        isArabic,
        labels.loadError,
      ]
    );

  useEffect(
    () => {
      void loadNotifications();
    },
    [
      loadNotifications,
    ]
  );

  useEffect(
    () => {
      function closeOnOutsideClick(
        event:
          MouseEvent
      ) {
        if (
          containerRef
            .current &&
          !containerRef
            .current
            .contains(
              event.target as
                Node
            )
        ) {
          setIsOpen(
            false
          );
        }
      }

      function closeOnEscape(
        event:
          KeyboardEvent
      ) {
        if (
          event.key ===
            "Escape"
        ) {
          setIsOpen(
            false
          );
        }
      }

      document.addEventListener(
        "mousedown",
        closeOnOutsideClick
      );

      document.addEventListener(
        "keydown",
        closeOnEscape
      );

      return () => {
        document.removeEventListener(
          "mousedown",
          closeOnOutsideClick
        );

        document.removeEventListener(
          "keydown",
          closeOnEscape
        );
      };
    },
    []
  );

  return (
    <div
      className="notificationBell"
      ref={
        containerRef
      }
    >
      <style>{`
        .notificationBell {
          position: relative;
          display: inline-flex;
          align-items: center;
        }

        .notificationBellButton {
          position: relative;
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          padding: 0;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.28);
          background: rgba(255, 255, 255, 0.08);
          color: #ffffff;
          cursor: pointer;
          transition:
            transform 0.18s ease,
            background 0.18s ease,
            border-color 0.18s ease;
        }

        .notificationBellButton:hover,
        .notificationBellButton[aria-expanded="true"] {
          transform: translateY(-1px);
          background: rgba(20, 184, 166, 0.18);
          border-color: rgba(94, 234, 212, 0.5);
        }

        .notificationBellButton svg {
          width: 20px;
          height: 20px;
        }

        .notificationBellBadge {
          position: absolute;
          inset-block-start: -5px;
          inset-inline-end: -5px;
          min-width: 20px;
          height: 20px;
          display: grid;
          place-items: center;
          padding: 0 5px;
          border-radius: 999px;
          background: #ef4444;
          color: #ffffff;
          border: 2px solid #020617;
          font-size: 0.68rem;
          font-weight: 950;
          line-height: 1;
        }

        .notificationDrawer {
          position: absolute;
          z-index: 120;
          inset-block-start: calc(100% + 14px);
          inset-inline-end: 0;
          width: min(420px, calc(100vw - 28px));
          max-height: min(660px, calc(100vh - 110px));
          overflow: hidden;
          border-radius: 24px;
          border: 1px solid rgba(148, 163, 184, 0.25);
          background: rgba(255, 255, 255, 0.98);
          color: #0f172a;
          box-shadow: 0 28px 80px rgba(2, 6, 23, 0.34);
        }

        .notificationDrawerHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 20px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.2);
          background:
            linear-gradient(
              135deg,
              #f0fdfa,
              #ecfeff
            );
        }

        .notificationDrawerHeader h2 {
          margin: 0;
          color: #0f172a;
          font-size: 1.15rem;
        }

        .notificationDrawerHeader span {
          display: block;
          margin-top: 4px;
          color: #64748b;
          font-size: 0.76rem;
          font-weight: 800;
        }

        .notificationDrawerClose {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border: 0;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.07);
          color: #334155;
          cursor: pointer;
          font-size: 1rem;
        }

        .notificationDrawerBody {
          max-height: 540px;
          overflow-y: auto;
          padding: 12px;
        }

        .notificationState {
          padding: 34px 22px;
          text-align: center;
        }

        .notificationState strong {
          display: block;
          color: #0f172a;
          font-size: 1rem;
        }

        .notificationState p {
          margin: 8px 0 0;
          color: #64748b;
          line-height: 1.65;
        }

        .notificationStateError {
          color: #b91c1c;
        }

        .notificationList {
          display: grid;
          gap: 10px;
        }

        .notificationItem {
          padding: 16px;
          border-radius: 18px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          background: #f8fafc;
        }

        .notificationItem.unread {
          background:
            linear-gradient(
              135deg,
              #ecfeff,
              #ffffff
            );
          border-color: rgba(13, 148, 136, 0.28);
          box-shadow: inset 4px 0 0 #14b8a6;
        }

        [dir="rtl"] .notificationItem.unread {
          box-shadow: inset -4px 0 0 #14b8a6;
        }

        .notificationItemTop {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }

        .notificationPriority {
          display: inline-flex;
          padding: 5px 9px;
          border-radius: 999px;
          background: #e2e8f0;
          color: #475569;
          font-size: 0.68rem;
          font-weight: 950;
        }

        .notificationPriority.high {
          background: #ffedd5;
          color: #c2410c;
        }

        .notificationPriority.critical {
          background: #fee2e2;
          color: #b91c1c;
        }

        .notificationDate {
          color: #94a3b8;
          font-size: 0.72rem;
          font-weight: 800;
          white-space: nowrap;
        }

        .notificationItem h3 {
          margin: 12px 0 7px;
          color: #0f172a;
          font-size: 0.98rem;
          line-height: 1.4;
        }

        .notificationItem p {
          margin: 0;
          color: #64748b;
          font-size: 0.86rem;
          line-height: 1.6;
        }

        .notificationSafety {
          margin-top: 11px !important;
          padding: 10px 12px;
          border-radius: 13px;
          background: #fff7ed;
          color: #9a3412 !important;
          border: 1px solid #fed7aa;
          font-weight: 800;
        }

        .notificationActions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 14px;
        }

        .notificationActions button,
        .notificationActions a {
          min-height: 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 7px 11px;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 900;
          text-decoration: none;
          cursor: pointer;
        }

        .notificationActionPrimary {
          border: 0;
          background: #0f766e;
          color: #ffffff;
        }

        .notificationActionSecondary {
          border: 1px solid rgba(15, 118, 110, 0.24);
          background: #ffffff;
          color: #0f766e;
        }

        .notificationActionDismiss {
          border: 0;
          background: transparent;
          color: #64748b;
        }

        .notificationActions button:disabled {
          opacity: 0.55;
          cursor: wait;
        }

        @media (max-width: 900px) {
          .notificationBell {
            width: 100%;
            justify-content: flex-start;
          }

          .notificationDrawer {
            position: fixed;
            inset-inline: 14px;
            inset-block-start: 78px;
            width: auto;
          }
        }
      `}</style>

      <button
        type="button"
        className="notificationBellButton"
        aria-label={
          labels.notifications
        }
        aria-haspopup="dialog"
        aria-expanded={
          isOpen
        }
        onClick={
          () =>
            setIsOpen(
              (
                current
              ) =>
                !current
            )
        }
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <path
            d="M10 21h4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>

        {unreadCount >
          0 && (
          <span className="notificationBellBadge">
            {unreadCount >
            99
              ? "99+"
              : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <section
          className="notificationDrawer"
          role="dialog"
          aria-label={
            labels.notifications
          }
        >
          <header className="notificationDrawerHeader">
            <div>
              <h2>
                {
                  labels.notifications
                }
              </h2>

              <span>
                {unreadCount >
                0
                  ? isArabic
                    ? `${unreadCount} غير مقروء`
                    : `${unreadCount} unread`
                  : isArabic
                    ? "لا توجد إشعارات غير مقروءة"
                    : "No unread notifications"}
              </span>
            </div>

            <button
              type="button"
              className="notificationDrawerClose"
              aria-label={
                labels.close
              }
              onClick={
                () =>
                  setIsOpen(
                    false
                  )
              }
            >
              ×
            </button>
          </header>

          <div className="notificationDrawerBody">
            {isLoading ? (
              <div className="notificationState">
                <strong>
                  {
                    labels.loading
                  }
                </strong>
              </div>
            ) : error &&
              notifications.length ===
                0 ? (
              <div className="notificationState notificationStateError">
                <strong>
                  {error}
                </strong>
              </div>
            ) : notifications.length ===
              0 ? (
              <div className="notificationState">
                <strong>
                  {
                    labels.emptyTitle
                  }
                </strong>

                <p>
                  {
                    labels.emptyBody
                  }
                </p>
              </div>
            ) : (
              <div className="notificationList">
                {notifications.map(
                  (
                    notification
                  ) => {
                    const isUpdating =
                      updatingId ===
                      notification.id;

                    return (
                      <article
                        className={`notificationItem ${notification.status}`}
                        key={
                          notification.id
                        }
                      >
                        <div className="notificationItemTop">
                          <span
                            className={`notificationPriority ${notification.priority}`}
                          >
                            {getPriorityLabel(
                              notification.priority,
                              isArabic
                            )}
                          </span>

                          <span className="notificationDate">
                            {formatNotificationDate(
                              notification.createdAt,
                              isArabic
                            )}
                          </span>
                        </div>

                        <h3>
                          {
                            notification.title
                          }
                        </h3>

                        <p>
                          {
                            notification.body
                          }
                        </p>

                        {notification
                          .safety
                          ?.note && (
                          <p className="notificationSafety">
                            {
                              notification
                                .safety
                                .note
                            }
                          </p>
                        )}

                        <div className="notificationActions">
                          {notification.action && (
                            <Link
                              href={
                                notification
                                  .action
                                  .href
                              }
                              className="notificationActionPrimary"
                              onClick={
                                () => {
                                  setIsOpen(
                                    false
                                  );

                                  if (
                                    notification
                                      .status ===
                                    "unread"
                                  ) {
                                    void updateNotification(
                                      notification,
                                      "read"
                                    );
                                  }
                                }
                              }
                            >
                              {notification
                                .action
                                .label ||
                                labels.openAction}
                            </Link>
                          )}

                          {notification
                            .status ===
                            "unread" && (
                            <button
                              type="button"
                              className="notificationActionSecondary"
                              disabled={
                                isUpdating
                              }
                              onClick={
                                () =>
                                  void updateNotification(
                                    notification,
                                    "read"
                                  )
                              }
                            >
                              {
                                labels.markRead
                              }
                            </button>
                          )}

                          <button
                            type="button"
                            className="notificationActionDismiss"
                            disabled={
                              isUpdating
                            }
                            onClick={
                              () =>
                                void updateNotification(
                                  notification,
                                  "dismiss"
                                )
                            }
                          >
                            {
                              labels.dismiss
                            }
                          </button>
                        </div>
                      </article>
                    );
                  }
                )}
              </div>
            )}

            {error &&
              notifications.length >
                0 && (
              <div className="notificationState notificationStateError">
                <strong>
                  {error}
                </strong>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}