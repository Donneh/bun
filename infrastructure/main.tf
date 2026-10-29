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

  web_wrangler_config = jsondecode(file("${path.module}/../apps/web/wrangler.jsonc"))
  www_hostname        = "www.${var.web_hostname}"
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
    traces = {
      enabled = true
    }
  }
}

resource "cloudflare_worker_version" "api" {
  account_id         = var.account_id
  worker_id          = cloudflare_worker.api.id
  compatibility_date = local.wrangler_config.compatibility_date
  main_module        = "index.js"

  bindings = [{
    type = "version_metadata"
    name = "CF_VERSION_METADATA"
  }]

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

resource "cloudflare_zone_setting" "always_use_https" {
  zone_id    = var.zone_id
  setting_id = "always_use_https"
  value      = "on"
}

resource "cloudflare_ruleset" "rate_limit" {
  zone_id = var.zone_id
  name    = "Rate limit the API"
  kind    = "zone"
  phase   = "http_ratelimit"

  rules = [{
    ref         = "api_requests_per_ip"
    description = "Block an IP for 10 seconds after 50 requests in 10 seconds"
    expression  = "http.host eq \"${var.hostname}\""
    action      = "block"
    ratelimit = {
      characteristics     = ["cf.colo.id", "ip.src"]
      period              = 10
      requests_per_period = 50
      mitigation_timeout  = 10
    }
  }]
}

resource "cloudflare_worker" "web" {
  account_id = var.account_id
  name       = local.web_wrangler_config.name

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

resource "cloudflare_worker_version" "web" {
  account_id         = var.account_id
  worker_id          = cloudflare_worker.web.id
  compatibility_date = local.web_wrangler_config.compatibility_date

  assets = {
    directory = "${path.module}/../apps/web/${local.web_wrangler_config.assets.directory}"
    config = {
      not_found_handling = local.web_wrangler_config.assets.not_found_handling
    }
  }
}

resource "cloudflare_workers_deployment" "web" {
  account_id  = var.account_id
  script_name = cloudflare_worker.web.name
  strategy    = "percentage"

  versions = [{
    version_id = cloudflare_worker_version.web.id
    percentage = 100
  }]
}

resource "cloudflare_workers_custom_domain" "web" {
  for_each = toset([var.web_hostname, local.www_hostname])

  account_id = var.account_id
  zone_id    = var.zone_id
  hostname   = each.value
  service    = cloudflare_worker.web.name

  depends_on = [cloudflare_workers_deployment.web]
}

resource "cloudflare_ruleset" "redirect_www" {
  zone_id = var.zone_id
  name    = "Redirect www to the apex"
  kind    = "zone"
  phase   = "http_request_dynamic_redirect"

  rules = [{
    ref         = "www_to_apex"
    description = "Redirect ${local.www_hostname} to ${var.web_hostname}, keeping the path and query"
    expression  = "http.host eq \"${local.www_hostname}\""
    action      = "redirect"
    action_parameters = {
      from_value = {
        status_code           = 301
        preserve_query_string = true
        target_url = {
          expression = "concat(\"https://${var.web_hostname}\", http.request.uri.path)"
        }
      }
    }
  }]
}
