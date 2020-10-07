const core = require("@actions/core");
const github = require("@actions/github");

const { Octokit } = require("@octokit/rest");

const createMarker = (commentId) =>
  commentId ? `<!-- comment-id: ${commentId} -->` : null;

const formatComment = (comment, marker) =>
  marker !== null ? marker + "\n" + comment : comment;

const isAlreadyPosted = async (client, issueId, marker) => {
  if (marker === null) {
    return false;
  }

  const params = {
    ...github.context.repo,
    issue_number: issueId,
  };

  const pages = client.paginate.iterator(client.issues.listComments, params);

  for await (const response of pages) {
    for (const comment of response.data) {
      if (comment.user.login !== "github-actions[bot]") {
        continue;
      }

      if (comment.body.indexOf(marker) > -1) {
        return true;
      }
    }
  }

  return false;
};

const main = async () => {
  try {
    const token = core.getInput("token");
    const issueId = core.getInput("issue");
    const comment = core.getInput("comment");
    const commentId = core.getInput("comment-id");

    const marker = createMarker(commentId);

    const client = new Octokit({ auth: token });

    if (await isAlreadyPosted(client, issueId, marker)) {
      console.log(
        `A comment with id '${commentId}' has already been posted. No comment will be posted...`
      );

      return;
    }

    await client.issues.createComment({
      ...github.context.repo,
      issue_number: issueId,
      body: formatComment(comment, marker),
    });
  } catch (e) {
    core.setFailed(e.message);
  }
};

main();
