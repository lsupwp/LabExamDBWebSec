/**
 * Canonical markers students must put in responses.
 * Grader matches these exact strings (LeetCode-style expected output).
 */
export const EXAM_MSG = {
  CSRF_REJECTED: "EXAM_MSG:CSRF_REJECTED",
  ROOM_INVALID: "EXAM_MSG:ROOM_INVALID",
  FORBIDDEN: "EXAM_MSG:FORBIDDEN",
  UPLOAD_REJECTED: "EXAM_MSG:UPLOAD_REJECTED",
  GENERIC_ERROR: "EXAM_MSG:GENERIC_ERROR",
  LOGIN_LOCKED: "EXAM_MSG:LOGIN_LOCKED",
  LOGIN_OK_HINT: "repairs.php", // redirect target after login — not a marker body
} as const;

export type ExamMsgId = keyof typeof EXAM_MSG;
