const {getOctokit, context} = require('@actions/github');
const core = require('@actions/core');
const util = require('util');
const execFile = util.promisify(require('child_process').execFile);

async function run() {
	try {
		const {owner, repo} = context.repo;

		const repoURL = process.env.GITHUB_SERVER_URL + '/' + process.env.GITHUB_REPOSITORY;

		const releaseTemplate = core.getInput('template');
		const commitTemplate = core.getInput('commit-template');
		const exclude = core.getInput('exclude');
		const isDraft = core.getInput('draft') === 'true';
		const isPrerelease = core.getInput('prerelease') === 'true';
		
		// Fetch tags from remote
		await execFile('git', ['fetch', 'origin', '+refs/tags/*:refs/tags/*']);

		// Get all tags, sorted by recently created tags
		let branch = core.getInput('tag') || 'HEAD';
		let tagTemplate = core.getInput('tagTemplate') || '';
		let pathFilter = core.getInput('pathFilter') || '';
		let grouping = core.getInput('grouping') === 'true' || false;
		
		const {stdout: t} = await execFile('git', ['tag', '-l', '--sort=-creatordate', tagTemplate,'--merged', branch]);
		const tags = t.split('\n').filter(Boolean).map(tag => tag.trim());

		if (tags.length === 0) {
			core.info('There is nothing to be done here. Exiting!');
			return;
		}

		let pushedTag = tags[0];
		let fromTag = tags[0];
		if (core.getInput('tag')) {
			pushedTag = core.getInput('tag')
			fromTag = tags[0];
		} else {
			if (tags.length < 2) {
				const {stdout: rootCommit} = await execFile('git', ['rev-list', '--max-parents=0', branch]);
				fromTag = rootCommit.trim('');
			} else {
				fromTag = tags[1];
			}
		}

		if (process.env.GITHUB_REF.startsWith('refs/tags/')) {
			pushedTag = process.env.GITHUB_REF.replace('refs/tags/', '');
			core.info('Using pushed tag as reference: ' + pushedTag);
		}

		// Get range to generate diff
		let range = fromTag + '..' + pushedTag;

		core.info('Computed range: ' + range);

		// Get commits between computed range
		let {stdout: commits} = await execFile('git', ['log', '--format=%H%s', range, '--', pathFilter], { shell: true });
		commits = commits.split('\n').filter(Boolean).map(line => ({
			hash: line.slice(0, 8),
			title: line.slice(40).trim()
		}));
		
		if (exclude) {
			const regex = new RegExp(exclude);
			commits = commits.filter(({title}) => !regex.test(title));
		}

		if (grouping) {
			commits.sort(function (a, b) {
											headb = String(b.title.match(/^(?:REVERT "?)?(\S+)(?:\s.*|$)/i).slice(1));
											heada = String(a.title.match(/^(?:REVERT "?)?(\S+)(?:\s.*|$)/i).slice(1));
											return headb.localeCompare(heada);
										}
						);
		}
		
		// Generate markdown content
		const commitEntries = [];
		if (commits.length === 0) {
			commitEntries.push('_Maintenance release_');
		} else {
			var prevHead='';
			for (const {hash, title} of commits) {
				template = commitTemplate;
				head = String(title.match(/^(?:REVERT "?)?(\S+)(?:\s.*|$)/i).slice(1));
				if (grouping) {
					if ( head == prevHead ) {
						template = "    ".concat(commitTemplate);
					} 
					prevHead = head;
				} 

				const line = template
					.replace('{hash}', hash)
					.replace('{title}', title)
					.replace('{head}', head)
					.replace('{url}', repoURL + '/commit/' + hash);
				commitEntries.push(line);
			}
		}

		const octokit = getOctokit(core.getInput('token'));
		const createReleaseResponse = await octokit.repos.createRelease({
			repo,
			owner,
			tag_name: pushedTag, // eslint-disable-line camelcase
			body: releaseTemplate
				.replace('{commits}', commitEntries.join('\n'))
				.replace('{range}', `[\`${range}\`](${repoURL}/compare/${range})`),
			draft: isDraft,
			prerelease: isPrerelease
		});

		core.info('Created release `' + createReleaseResponse.data.id + '` for tag `' + pushedTag + '`');
	} catch (error) {
		core.setFailed(error.message);
	}
}

run();
