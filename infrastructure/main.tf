terraform {
  required_providers {
    cloudflare = {
      source = "cloudflare/cloudflare"
      version = "~> 5"
    }
  }
}

provider "cloudflare" {
  api_token = ""
}

variable "zone_id" {
  default = ""
}

variable "account_id" {
  default = ""
}

variable "domain" {
  default = ""
}

resource "cloudflare_dns_record" "www" {
  zone_id = "<YOUR_ZONE_ID>"
  name    = "www"
  content = "203.0.113.10"
  type    = "A"
  ttl     = 1
  proxied = true
  comment = "Domain verification record"
}
