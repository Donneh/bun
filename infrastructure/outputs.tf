output "api_url" {
  value = "https://${cloudflare_workers_custom_domain.api.hostname}"
}

output "worker_version_id" {
  value = cloudflare_worker_version.api.id
}

output "web_version_id" {
  value = cloudflare_worker_version.web.id
}

output "version_overrides" {
  value       = "${module.api_deployment.version_override},${module.web_deployment.version_override}"
  description = "A Cloudflare-Workers-Version-Overrides header value that routes requests to the new version of both Workers."
}

output "web_url" {
  value = "https://${cloudflare_workers_custom_domain.web[var.web_hostname].hostname}"
}

output "www_url" {
  value = "https://${cloudflare_workers_custom_domain.web[local.www_hostname].hostname}"
}
