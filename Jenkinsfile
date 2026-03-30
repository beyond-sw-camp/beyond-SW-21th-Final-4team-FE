pipeline {
    agent any

    triggers {
        githubPush()
    }

    environment {
        AWS_REGION = 'ap-northeast-2'
        EKS_CLUSTER_NAME = 'freebridge-eks'
        AWS_CREDENTIALS_ID = 'aws-eks-jenkins'
        EKS_TOOL_IMAGE = 'dtzar/helm-kubectl:latest'

        CRED_ID_FE = 'github-fe-key'
        CRED_ID_MANIFEST = 'github-manifest-key'
        MANIFEST_REPO_URL = 'git@github.com:20250918-beyond-SW-Camp-21th/beyond-SW-21th-Final-4team-Manifest-file.git'
        MANIFEST_BRANCH = 'main'

        IMAGE_NAME = 'o2ppo/freebrfront001'
        DOCKER_CRED_ID = 'dockerhub-credentials'
        GIT_EMAIL = 'lmjayoul@gmail.com'
        FRONTEND_API_BASE_URL = ''
    }

    stages {
        stage('EKS Preflight') {

            steps {
                script {
                    withCredentials([[
                        $class: 'AmazonWebServicesCredentialsBinding',
                        credentialsId: "${env.AWS_CREDENTIALS_ID}",
                        accessKeyVariable: 'AWS_ACCESS_KEY_ID',
                        secretKeyVariable: 'AWS_SECRET_ACCESS_KEY'
                    ]]) {
                        sh """
                            set -euxo pipefail
                            export AWS_DEFAULT_REGION=${env.AWS_REGION}

                            if ! command -v aws > /dev/null 2>&1; then
                                echo 'aws CLI is not installed.'
                                exit 1
                            fi

                            aws --version
                            kubectl version --client=true
                            aws sts get-caller-identity
                            aws eks update-kubeconfig --region ${env.AWS_REGION} --name ${env.EKS_CLUSTER_NAME}
                            kubectl cluster-info
                            kubectl get nodes
                            kubectl get ns
                        """
                    }
                }
            }
        }

        stage('Checkout Code') {
            steps {
                cleanWs()
                checkout scm
                echo 'Source Code Checkout Complete'
            }
        }

        stage('Setup & Check') {
            steps {
                script {
                    env.GIT_COMMIT_HASH = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
                    env.IMAGE_TAG = "${currentBuild.number}-${env.GIT_COMMIT_HASH}"

                    def rawBranch = env.BRANCH_NAME ?: (env.GIT_BRANCH ?: 'main')
                    env.TARGET_BRANCH = rawBranch.replace('origin/', '')

                    echo "Build Tag: ${env.IMAGE_TAG}"
                    echo "Target Branch: ${env.TARGET_BRANCH}"
                }
            }
        }

        stage('Build & Push') {
            steps {
                script {
                    withCredentials([usernamePassword(credentialsId: "${env.DOCKER_CRED_ID}", usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                        sh '''
                            set -eux

                            which docker || true
                            docker version
                            docker buildx version || true

                            export DOCKER_BUILDKIT=0
                            docker build \
                              --build-arg VITE_API_BASE_URL="${FRONTEND_API_BASE_URL:-}" \
                              -t ${IMAGE_NAME}:${IMAGE_TAG} .

                            echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
                            docker push ${IMAGE_NAME}:${IMAGE_TAG}

                            docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${IMAGE_NAME}:latest
                            docker push ${IMAGE_NAME}:latest
                        '''
                    }
                }
            }
        }

        stage('Update Manifest Repo') {
            steps {
                script {
                    sshagent(credentials: ["${env.CRED_ID_MANIFEST}"]) {
                        sh """
                            set -eux
                            mkdir -p ~/.ssh
                            ssh-keyscan github.com >> ~/.ssh/known_hosts

                            rm -rf manifest-repo
                            git clone ${env.MANIFEST_REPO_URL} manifest-repo

                            cd manifest-repo
                            git config user.name "Jenkins Frontend Bot"
                            git config user.email "${env.GIT_EMAIL}"

                            test -f kube-folder/frontend-deployment.yml
                            test -f kube-folder/frontend-service.yml
                            test -f kube-folder/ingress-set.yml

                            sed -i 's|image: ${env.IMAGE_NAME}:.*|image: ${env.IMAGE_NAME}:${env.IMAGE_TAG}|g' kube-folder/frontend-deployment.yml
                            grep 'image:' kube-folder/frontend-deployment.yml

                            git add .
                            if ! git diff --cached --quiet; then
                                git commit -m "[Jenkins] Update image to ${env.IMAGE_TAG}"
                                git push origin ${env.MANIFEST_BRANCH}
                                echo 'Manifest Repo Updated!'
                            else
                                echo 'No changes to push.'
                            fi
                        """
                    }
                }
            }
        }

        stage('Deploy Frontend and Ingress') {

            steps {
                script {
                    withCredentials([[
                        $class: 'AmazonWebServicesCredentialsBinding',
                        credentialsId: "${env.AWS_CREDENTIALS_ID}",
                        accessKeyVariable: 'AWS_ACCESS_KEY_ID',
                        secretKeyVariable: 'AWS_SECRET_ACCESS_KEY'
                    ]]) {
                        sh """
                            set -euxo pipefail
                            export AWS_DEFAULT_REGION=${env.AWS_REGION}

                            if ! command -v aws > /dev/null 2>&1; then
                                echo 'aws CLI is not installed.'
                                exit 1
                            fi

                            aws eks update-kubeconfig --region ${env.AWS_REGION} --name ${env.EKS_CLUSTER_NAME}
                            cd manifest-repo

                            test -f kube-folder/frontend-deployment.yml
                            test -f kube-folder/frontend-service.yml
                            test -f kube-folder/ingress-set.yml

                            kubectl apply -f kube-folder/frontend-deployment.yml
                            kubectl apply -f kube-folder/frontend-service.yml
                            
                            # 기존 frontend-ingress가 남아있다면 충돌 방지를 위해 삭제
                            kubectl delete ingress frontend-ingress --ignore-not-found=true || true
                            
                            kubectl apply -f kube-folder/ingress-set.yml

                            kubectl rollout restart deployment/frontend
                            kubectl rollout status deployment/frontend --timeout=180s

                            kubectl get svc frontend-service
                            kubectl get ingress ingress-set
                            kubectl describe ingress ingress-set || true
                        """
                    }
                }
            }
        }
    }

    post {
        always {
            sh 'docker logout || true'
            sh "docker rmi ${IMAGE_NAME}:${IMAGE_TAG} || true"
            sh "docker rmi ${IMAGE_NAME}:latest || true"
            sh 'docker image prune -f || true'
            cleanWs()
        }
        success {
            withCredentials([string(credentialsId: 'discord', variable: 'DISCORD')]) {
                discordSend(
                    description: """
                        **배포 성공!** :tada:

                        **Tag**: ${env.IMAGE_TAG}
                        **Repo**: [Manifest Repo Link](${env.MANIFEST_REPO_URL})
                        **Result**: SUCCESS
                    """.stripIndent(),
                    result: 'SUCCESS',
                    title: "${env.JOB_NAME} Build Success",
                    webhookURL: "$DISCORD"
                )
            }
        }
        failure {
            withCredentials([string(credentialsId: 'discord', variable: 'DISCORD')]) {
                discordSend(
                    description: '**배포 실패** :x: Check Console Output',
                    result: 'FAILURE',
                    title: "${env.JOB_NAME} Build Failed",
                    webhookURL: "$DISCORD"
                )
            }
        }
    }
}
