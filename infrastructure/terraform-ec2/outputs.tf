output "instance_id" {
  value = aws_instance.app.id
}

output "public_ip" {
  value = var.create_elastic_ip ? aws_eip.app[0].public_ip : aws_instance.app.public_ip
}

output "ssh_private_key_file" {
  value = local.create_key_pair ? local_sensitive_file.ssh_private_key[0].filename : "(using existing key_name=${var.key_name})"
}

output "ssh_command" {
  value = format(
    "ssh -i %s ec2-user@%s",
    local.create_key_pair ? basename(local_sensitive_file.ssh_private_key[0].filename) : "<your-key.pem>",
    var.create_elastic_ip ? aws_eip.app[0].public_ip : aws_instance.app.public_ip,
  )
}

output "http_url" {
  value = "http://${var.create_elastic_ip ? aws_eip.app[0].public_ip : aws_instance.app.public_ip}"
}

output "gateway_url" {
  value = "http://${var.create_elastic_ip ? aws_eip.app[0].public_ip : aws_instance.app.public_ip}:${var.gateway_port}"
}

output "app_dir" {
  value = "/opt/sendit"
}

output "documentdb_endpoint" {
  value     = var.enable_documentdb ? aws_docdb_cluster.main[0].endpoint : null
  sensitive = true
}

output "db_uri" {
  value     = local.db_uri
  sensitive = true
}
