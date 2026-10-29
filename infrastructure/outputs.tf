output "api_url" {
  value = "https://${cloudflare_workers_custom_domain.api.hostname}"
}

output "worker_version_id" {
  value = cloudflare_worker_version.api.id
}
