# Deployment Guide

This guide explains how to deploy PomoPomo to a Linux server using SSH.

## Prerequisites

1.  **Linux Server**: Ubuntu/Debian recommended.
2.  **SSH Access**: You must have SSH access to the server (e.g., `ssh user@ip`).
3.  **Docker & Docker Compose**: Must be installed on the server.
    -   Install Docker: `curl -fsSL https://get.docker.com | sh`
    -   Install Compose: `sudo apt install docker-compose` or via plugin.

## Deployment Steps

1.  **Prepare Environment**:
    -   Edit `.env.production` with your production secrets and URLs.
    -   Ensure `NEXT_PUBLIC_WS_URL` and `NEXT_PUBLIC_API_URL` point to your server's IP/Domain.

2.  **Run Deploy Script**:
    Run the `deploy.sh` script from your local machine:

    ```bash
    ./deploy.sh user@your-server-ip
    ```

    Example:
    ```bash
    ./deploy.sh ubuntu@51.38.190.126
    ```

3.  **Verify**:
    -   The script will copy files and run `docker-compose up -d --build`.
    -   Access `http://your-server-ip:3000` in your browser.

## Troubleshooting

-   **Permission Denied**: Ensure your SSH key is added (`ssh-add ~/.ssh/id_rsa`).
-   **Docker Errors**: SSH into the server and check logs:
    ```bash
    ssh user@ip
    cd pomopomo
    docker-compose -f docker-compose.prod.yml logs -f
    ```
