terraform {
  required_providers {
    cloudflare = {
      source = "cloudflare/cloudflare"
    }
  }
}

variable "account_id" {
  type = string
}

variable "script_name" {
  type = string
}

variable "version_id" {
  type        = string
  description = "The version this deployment releases."
}

variable "live_version_id" {
  type        = string
  default     = null
  description = "The version that serves traffic now. When set and different from version_id, it keeps all but canary_percentage of the traffic, and version_id is reached with a version override header."
}

locals {
  canary_percentage = 0.01
  staged            = var.live_version_id != null && var.live_version_id != var.version_id
}

resource "cloudflare_workers_deployment" "this" {
  account_id  = var.account_id
  script_name = var.script_name
  strategy    = "percentage"

  versions = local.staged ? [
    { version_id = var.version_id, percentage = local.canary_percentage },
    { version_id = var.live_version_id, percentage = 100 - local.canary_percentage },
  ] : [{ version_id = var.version_id, percentage = 100 }]

  lifecycle {
    create_before_destroy = true
  }
}

output "version_override" {
  value       = "${var.script_name}=\"${var.version_id}\""
  description = "An entry for the Cloudflare-Workers-Version-Overrides header that routes a request to version_id."
}
