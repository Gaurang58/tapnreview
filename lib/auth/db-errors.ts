/** Turns a Postgres/PostgREST error into something a manager can act on. */
export function explainDbError(error: { code?: string; message?: string } | null | undefined, thing = "that"): string {
  if (!error) return "";
  switch (error.code) {
    case "23505":
      return `A ${thing} with that name already exists here.`;
    case "42501":
      return "You don't have permission to do that here.";
    case "23514":
      return "That value isn't allowed. Check the Google link or name and try again.";
    case "23503":
      return "That choice no longer exists. Refresh the page and try again.";
    default:
      return (error.message ?? "").includes("cannot be changed")
        ? "That can't be changed once created."
        : "Something went wrong saving that. Please try again.";
  }
}
