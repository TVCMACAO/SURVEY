class User {
  final String id;  // MongoDB ObjectId es String
  final String username;
  final String email;
  final String role;
  final String? firstName;
  final String? lastName;
  final String? userGroupId;

  User({
    required this.id,
    required this.username,
    required this.email,
    required this.role,
    this.firstName,
    this.lastName,
    this.userGroupId,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      // Convertir id a String (puede venir como int o String)
      id: json['id']?.toString() ?? '',
      username: json['username'] ?? '',
      email: json['email'] ?? '',
      role: json['role'] ?? 'encuestador',
      firstName: json['first_name'],
      lastName: json['last_name'],
      userGroupId: json['user_group_id']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'username': username,
      'email': email,
      'role': role,
      'first_name': firstName,
      'last_name': lastName,
      'user_group_id': userGroupId,
    };
  }
  
  String get fullName {
    if (firstName != null || lastName != null) {
      return '${firstName ?? ''} ${lastName ?? ''}'.trim();
    }
    return username;
  }
}

