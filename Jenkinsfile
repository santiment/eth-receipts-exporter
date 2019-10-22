podTemplate(label: 'eth-receipts-exporter', containers: [
  containerTemplate(name: 'docker', image: 'docker', ttyEnabled: true, command: 'cat', envVars: [
    envVar(key: 'DOCKER_HOST', value: 'tcp://docker-host-docker-host:2375')
  ])
]) {
  node('eth-receipts-exporter') {
    stage('Run Tests') {
      container('docker') {
        def scmVars = checkout scm

        sh "docker build -t eth-receipts-exporter-test:${scmVars.GIT_COMMIT} -f Dockerfile-test ."
        sh "docker run --rm -t eth-receipts-exporter-test:${scmVars.GIT_COMMIT} npm run test"

        withCredentials([
          string(
            credentialsId: 'aws_account_id',
            variable: 'aws_account_id'
          )
        ]) {
          def awsRegistry = "${env.aws_account_id}.dkr.ecr.eu-central-1.amazonaws.com"
          docker.withRegistry("https://${awsRegistry}", "ecr:eu-central-1:ecr-credentials") {
            sh "docker build -t ${awsRegistry}/eth-receipts-exporter:${env.BRANCH_NAME} -t ${awsRegistry}/eth-receipts-exporter:${scmVars.GIT_COMMIT} ."
            sh "docker push ${awsRegistry}/eth-receipts-exporter:${env.BRANCH_NAME}"
            sh "docker push ${awsRegistry}/eth-receipts-exporter:${scmVars.GIT_COMMIT}"
          }
        }
      }
    }
  }
}
