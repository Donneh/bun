terraform {
  required_version = ">= 1.10"

  backend "s3" {
    bucket                      = "riftkeeper-tofu-state"
    key                         = "api.tfstate"
    region                      = "auto"
    use_lockfile                = true
    use_path_style              = true
    skip_credentials_validation = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_metadata_api_check     = true
    skip_s3_checksum            = true
  }

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.28"
    }
  }
}

provider "cloudflare" {}

locals {
  wrangler_config = jsondecode(file("${path.module}/../apps/api/wrangler.jsonc"))
  worker_bundle   = "${path.module}/../apps/api/dist/index.js"
}

resource "cloudflare_worker" "api" {
  account_id = var.account_id
  name       = local.wrangler_config.name

  subdomain = {
    enabled          = false
    previews_enabled = false
  }

  observability = {
    enabled = true
    logs = {
      enabled         = true
      invocation_logs = true
    }
  }
}

resource "cloudflare_worker_version" "api" {
  account_id         = var.account_id
  worker_id          = cloudflare_worker.api.id
  compatibility_date = local.wrangler_config.compatibility_date
  main_module        = "index.js"

  modules = [{
    name         = "index.js"
    content_type = "application/javascript+module"
    content_file = local.worker_bundle
  }]
}

resource "cloudflare_workers_deployment" "api" {
  account_id  = var.account_id
  script_name = cloudflare_worker.api.name
  strategy    = "percentage"

  versions = [{
    version_id = cloudflare_worker_version.api.id
    percentage = 100
  }]
}

resource "cloudflare_workers_custom_domain" "api" {
  account_id = var.account_id
  zone_id    = var.zone_id
  hostname   = var.hostname
  service    = cloudflare_worker.api.name

  depends_on = [cloudflare_workers_deployment.api]
}
