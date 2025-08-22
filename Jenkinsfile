pipeline {
	agent any
	stages {
		stage('Install') { steps { sh 'npm ci' } }
		stage('Build') { steps { sh 'npm run build' } }
		stage('Orchestrate') { steps { sh 'npm run orchestrate' } }
	}
}