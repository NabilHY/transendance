// Plain JS schema objects for Fastify/OpenAPI

const SearchUsersSchema = {
  description: 'Search for users by username or get all users',
  querystring: {
    type: 'object',
    properties: {
      search: {
        type: 'string',
        description: 'Search term for username filtering',
      },
    },
  },
  response: {
    200: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          username: { type: 'string' },
          email: { type: 'string', format: 'email' },
          created_at: { type: 'string' },
        },
      },
      description: 'OK - List of users',
    },
  },
};

const GetCurrentUserSchema = {
  description: "Retrieve the authenticated user's profile information",
  response: {
    200: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        username: { type: 'string' },
        email: { type: 'string', format: 'email' },
        created_at: { type: 'string' },
      },
      description: 'OK - Current user information retrieved',
    },
    401: {
      type: 'object',
      properties: {
        error: { type: 'string' },
      },
      description: 'Unauthorized - Authentication required',
    },
    404: {
      type: 'object',
      properties: {
        error: { type: 'string' },
      },
      description: 'Not Found - User not found',
    },
  },
};

const GetUserSchema = {
  description: 'Retrieve user information by ID',
  params: {
    type: 'object',
    properties: {
      id: { type: 'string' },
    },
    required: ['id'],
  },
  response: {
    200: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        username: { type: 'string' },
        email: { type: 'string', format: 'email' },
        created_at: { type: 'string' },
      },
      description: 'OK - User information retrieved',
    },
    401: {
      type: 'object',
      properties: {
        error: { type: 'string' },
      },
      description: 'Unauthorized - Authentication required',
    },
    404: {
      type: 'object',
      properties: {
        error: { type: 'string' },
      },
      description: 'Not Found - User not found',
    },
  },
};

const DeleteUserSchema = {
  description: "Permanently delete the authenticated user's account",
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
      description: 'OK - User account successfully deleted',
    },
    401: {
      type: 'object',
      properties: {
        error: { type: 'string' },
      },
      description: 'Unauthorized - Authentication required',
    },
    404: {
      type: 'object',
      properties: {
        error: { type: 'string' },
      },
      description: 'Not Found - User not found',
    },
  },
};

const UpdatePasswordSchema = {
  description: "Update the authenticated user's profile information",
  body: {
    type: 'object',
    properties: {
      firstname: { type: 'string' },
      lastname: { type: 'string' },
      email: { type: 'string', format: 'email' },
      profile_pic: { type: 'string' },
      username: { type: 'string' },
    },
    minProperties: 1,
  },
  response: {
    200: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        firstname: { type: 'string' },
        lastname: { type: 'string' },
        email: { type: 'string' },
        profile_pic: { type: ['string', 'null'] },
        username: { type: 'string' },
        created_at: { type: 'string' },
      },
      description: 'OK - Profile successfully updated',
    },
    400: {
      type: 'object',
      properties: {
        error: { type: 'string' },
      },
      description: 'Bad Request - No fields to update or validation error',
    },
    401: {
      type: 'object',
      properties: {
        error: { type: 'string' },
      },
      description: 'Unauthorized - Authentication required',
    },
  },
};

const UpdateProfileSchema = {
  description: "Update the authenticated user's profile information",
  body: {
    type: 'object',
    properties: {
      firstname: { type: 'string' },
      lastname: { type: 'string' },
      email: { type: 'string', format: 'email' },
      profile_pic: { type: 'string' },
      username: { type: 'string' },
    },
    minProperties: 1,
  },
  response: {
    200: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        firstname: { type: 'string' },
        lastname: { type: 'string' },
        email: { type: 'string' },
        profile_pic: { type: ['string', 'null'] },
        username: { type: 'string' },
        created_at: { type: 'string' },
      },
      description: 'OK - Profile successfully updated',
    },
    400: {
      type: 'object',
      properties: {
        error: { type: 'string' },
      },
      description: 'Bad Request - No fields to update or validation error',
    },
    401: {
      type: 'object',
      properties: {
        error: { type: 'string' },
      },
      description: 'Unauthorized - Authentication required',
    },
  },
};

const AddFriendSchema = {
  description: 'Send a friend request to another user',
  params: {
    type: 'object',
    properties: {
      id: { type: 'string' },
    },
    required: ['id'],
  },
  response: {
    201: {
      type: 'object',
      description: 'Created - Friend request successfully sent',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        requestId: { type: 'string' },
      },
    },
    400: {
      type: 'object',
      description: 'Bad Request - Invalid request due to business rules violation',
      properties: {
        error: { type: 'string' },
      },
    },
    403: {
      type: 'object',
      description: 'Forbidden - Cannot send friend request due to blocking relationship',
      properties: {
        error: { type: 'string' },
      },
    },
    404: {
      type: 'object',
      description: 'Not Found - Target user does not exist',
      properties: {
        error: { type: 'string' },
      },
    },
  },
};

const BlockUserSchema = {
  params: {
    type: 'object',
    description: 'Send a block request to another user',
    properties: {
      id: { type: 'string' },
    },
    required: ['id'],
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
    201: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
    400: {
      type: 'object',
      properties: {
        error: { type: 'string' },
      },
    },
    404: {
      type: 'object',
      properties: {
        error: { type: 'string' },
      },
    },
  },
};

module.exports = {
  SearchUsersSchema,
  GetCurrentUserSchema,
  GetUserSchema,
  DeleteUserSchema,
  UpdatePasswordSchema,
  UpdateProfileSchema,
  AddFriendSchema,
  BlockUserSchema,
};


