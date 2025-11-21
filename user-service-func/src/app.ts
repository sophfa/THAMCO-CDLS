// Legacy entry point kept for compatibility with older tooling.
// Azure loads function handlers via function.json, so this file exists only
// to satisfy the default package.json main field.
import "./functions/users/listUsersHttp";
import "./functions/users/getUserHttp";
import "./functions/users/broadcastUserSnapshotHttp";
import "./functions/events/handleUserSnapshotRequestEvent";
