import * as github from '@actions/github';
import {Octokit} from '@octokit/core';
import {OctokitResponse} from '@octokit/types';

export class GitHubClient {
  private octokit: Octokit;

  constructor(token: string, private owner: string, private repo: string) {
    this.octokit = github.getOctokit(token);
  }

  async getTags(): Promise<TagInfo[]> {
    const res = await this.octokit.request('GET /repos/{owner}/{repo}/tags', {
      owner: this.owner,
      repo: this.repo,
      per_page: 100, // There might be some custom tags. Take the maximum amount of items to avoid searching for the valid latest release through several pages
    });

    this.throwIfNotOk(res);

    return res.data;
  }

  async getCommits(startFromSha: string): Promise<CommitInfo[]> {
    const res = await this.octokit.request('GET /repos/{owner}/{repo}/commits', {
      owner: this.owner,
      repo: this.repo,
      sha: startFromSha,
      per_page: 100, // Do not search for the latest release commit forever
    });

    this.throwIfNotOk(res);

    return res.data;
  }

  async createTag(tagName: string, comments: string, commitSha: string): Promise<void> {
    this.throwIfNotOk(
      await this.octokit.request('POST /repos/{owner}/{repo}/git/tags', {
        owner: this.owner,
        repo: this.repo,
        tag: tagName,
        message: comments,
        object: commitSha,
        type: 'commit',
      }),
    );

    this.throwIfNotOk(
      await this.octokit.request('POST /repos/{owner}/{repo}/git/refs', {
        owner: this.owner,
        repo: this.repo,
        ref: `refs/tags/${tagName}`,
        sha: commitSha,
      }),
    );
  }

  throwIfNotOk<T>(response: OctokitResponse<T, number>): void {
    if (response.status < 200 || response.status > 299) {
      throw new Error(
        `Unexpected status code while calling GitHub API: ${
          response.status
        }. Data: ${JSON.stringify(response.data)}`,
      );
    }
  }
}

export interface TagInfo {
  name: string;
  commit: {
    sha: string;
  };
}

export interface CommitInfo {
  sha: string;
  commit: {
    message: string;
  };
}
