output "api_url" {
  value = "https://${cloudflare_workers_custom_domain.api.hostname}"
}

output "worker_version_id" {
  value = cloudflare_worker_version.api.id
}

output "web_url" {
  value = "https://${cloudflare_workers_custom_domain.web[var.web_hostname].hostname}"
}

output "www_url" {
  value = "https://${cloudflare_workers_custom_domain.web[local.www_hostname].hostname}"
}
